import { prisma } from "@/lib/prisma";
import type { Role } from "@/lib/constants";

export type ProratedLeaveInfo = {
    annualQuota: number;
    entitled: number;
    isProrated: boolean;
    joinDate: string | null;
};

export const LEAVE_QUOTA_BY_ROLE: Record<Role, number> = {
    FOUNDER: 30,
    HR_ADMIN: 30,
    MANAGER: 24,
    TEAM_LEAD: 22,
    EMPLOYEE: 22,
    INTERN: 10,
    CONTRACTOR: 15,
};

export function countInclusiveDays(start: Date, end: Date): number {
    const startUtc = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
    const endUtc = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
    const diff = Math.floor((endUtc - startUtc) / (1000 * 60 * 60 * 24));
    return diff + 1;
}

function daysInCalendarYear(year: number): number {
    return (year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)) ? 366 : 365;
}

function startOfCalendarDay(d: Date): Date {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/**
 * Prorate annual leave from join date through end of calendar year (inclusive days).
 * Full annual quota if joined before the current year.
 */
export function computeProratedLeaveQuota(
    annualQuota: number,
    joinDate: Date | string | null | undefined,
    asOf: Date = new Date()
): ProratedLeaveInfo {
    const annual = annualQuota;
    if (!joinDate) {
        return { annualQuota: annual, entitled: annual, isProrated: false, joinDate: null };
    }

    const join = startOfCalendarDay(new Date(joinDate));
    const year = asOf.getFullYear();
    const yearStart = new Date(year, 0, 1);
    const yearEnd = new Date(year, 11, 31);
    const joinIso = join.toISOString();

    if (join > yearEnd) {
        return { annualQuota: annual, entitled: 0, isProrated: true, joinDate: joinIso };
    }
    if (join <= yearStart) {
        return { annualQuota: annual, entitled: annual, isProrated: false, joinDate: joinIso };
    }

    const eligibleDays = countInclusiveDays(join, yearEnd);
    const yearDays = daysInCalendarYear(year);
    const entitled = Math.round(((annual * eligibleDays) / yearDays) * 10) / 10;

    return {
        annualQuota: annual,
        entitled,
        isProrated: true,
        joinDate: joinIso,
    };
}

export async function getLeaveBalance(userId: string, role: Role) {
    const [leaves, user] = await Promise.all([
        prisma.leave.findMany({
            where: { userId },
            orderBy: { startDate: "desc" },
        }),
        prisma.user.findUnique({
            where: { id: userId },
            select: {
                createdAt: true,
                profile: { select: { joinDate: true } },
            },
        }),
    ]);

    const approved = leaves.filter((l) => l.status === "APPROVED");
    const pending = leaves.filter((l) => l.status === "PENDING");

    const usedDays = approved.reduce(
        (sum, leave) => sum + countInclusiveDays(leave.startDate, leave.endDate),
        0
    );

    const pendingDays = pending.reduce(
        (sum, leave) => sum + countInclusiveDays(leave.startDate, leave.endDate),
        0
    );

    const annualQuota = LEAVE_QUOTA_BY_ROLE[role] ?? 22;
    const joinDate = user?.profile?.joinDate ?? user?.createdAt ?? null;
    const proration = computeProratedLeaveQuota(annualQuota, joinDate);
    const total = proration.entitled;

    return {
        total,
        annualQuota: proration.annualQuota,
        isProrated: proration.isProrated,
        joinDate: proration.joinDate,
        used: usedDays,
        pending: pendingDays,
        remaining: Math.max(0, Math.round((total - usedDays) * 10) / 10),
        byType: {
            casual: approved.filter((l) => l.type === "CASUAL").length,
            sick: approved.filter((l) => l.type === "SICK").length,
        },
    };
}
