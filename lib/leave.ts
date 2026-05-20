import { prisma } from "@/lib/prisma";
import type { Role } from "@/lib/constants";

export type LeavePeriod = {
    periodStart: Date;
    /** Inclusive — day before next work anniversary */
    periodEnd: Date;
    isFirstPeriod: boolean;
};

export type ProratedLeaveInfo = {
    annualQuota: number;
    entitled: number;
    isProrated: boolean;
    joinDate: string | null;
    /** Months accrued so far in the current leave period */
    monthsCredited?: number;
    /** Next anniversary when full quota renews (first period only) */
    nextAnniversary?: string | null;
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

/** Parse join date in local calendar (avoids UTC day-shift on YYYY-MM-DD strings). */
export function parseJoinCalendarDate(
    joinDate: Date | string | null | undefined
): Date | null {
    if (!joinDate) return null;
    if (typeof joinDate === "string") {
        const datePart = joinDate.split("T")[0];
        const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(datePart);
        if (match) {
            return new Date(
                Number(match[1]),
                Number(match[2]) - 1,
                Number(match[3])
            );
        }
    }
    const d = new Date(joinDate);
    if (Number.isNaN(d.getTime())) return null;
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function formatJoinCalendarDate(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
}

export function addCalendarYears(d: Date, years: number): Date {
    return new Date(d.getFullYear() + years, d.getMonth(), d.getDate());
}

/**
 * Leave year runs from work anniversary to the day before the next anniversary.
 * First period starts on join date; later periods renew on each anniversary.
 */
export function getLeavePeriod(join: Date, asOf: Date): LeavePeriod | null {
    if (asOf < join) return null;

    let periodStart = join;
    let nextStart = addCalendarYears(periodStart, 1);

    while (nextStart <= asOf) {
        periodStart = nextStart;
        nextStart = addCalendarYears(periodStart, 1);
    }

    const periodEnd = new Date(nextStart);
    periodEnd.setDate(periodEnd.getDate() - 1);

    return {
        periodStart,
        periodEnd,
        isFirstPeriod: periodStart.getTime() === join.getTime(),
    };
}

/** Calendar months from join month through asOf month (inclusive), capped at 12. */
export function countAccruedMonthsSinceJoin(join: Date, asOf: Date): number {
    if (asOf < join) return 0;

    let months = 0;
    let y = join.getFullYear();
    let m = join.getMonth();
    const endY = asOf.getFullYear();
    const endM = asOf.getMonth();

    while (y < endY || (y === endY && m <= endM)) {
        months++;
        m++;
        if (m > 11) {
            m = 0;
            y++;
        }
    }
    return Math.min(months, 12);
}

export function leaveOverlapsPeriod(
    leaveStart: Date,
    leaveEnd: Date,
    periodStart: Date,
    periodEnd: Date
): boolean {
    const start = new Date(
        leaveStart.getFullYear(),
        leaveStart.getMonth(),
        leaveStart.getDate()
    );
    const end = new Date(
        leaveEnd.getFullYear(),
        leaveEnd.getMonth(),
        leaveEnd.getDate()
    );
    return end >= periodStart && start <= periodEnd;
}

/**
 * Monthly accrual (annual ÷ 12 × months) until first work anniversary.
 * After each anniversary, full annual quota renews for that leave year.
 */
export function computeProratedLeaveQuota(
    annualQuota: number,
    joinDate: Date | string | null | undefined,
    asOf: Date = new Date()
): ProratedLeaveInfo {
    const annual = annualQuota;
    const join = parseJoinCalendarDate(joinDate);
    if (!join) {
        return { annualQuota: annual, entitled: annual, isProrated: false, joinDate: null };
    }

    const joinIso = formatJoinCalendarDate(join);
    const period = getLeavePeriod(join, asOf);

    if (!period) {
        return {
            annualQuota: annual,
            entitled: 0,
            isProrated: true,
            joinDate: joinIso,
            monthsCredited: 0,
            nextAnniversary: formatJoinCalendarDate(addCalendarYears(join, 1)),
        };
    }

    if (!period.isFirstPeriod) {
        return {
            annualQuota: annual,
            entitled: annual,
            isProrated: false,
            joinDate: joinIso,
            monthsCredited: 12,
            nextAnniversary: null,
        };
    }

    const monthsCredited = countAccruedMonthsSinceJoin(join, asOf);
    const perMonth = annual / 12;
    const entitled = Math.round(perMonth * monthsCredited * 10) / 10;
    const nextAnniversary = formatJoinCalendarDate(addCalendarYears(join, 1));

    return {
        annualQuota: annual,
        entitled,
        isProrated: true,
        joinDate: joinIso,
        monthsCredited,
        nextAnniversary,
    };
}

export async function getLeaveBalance(userId: string, role: Role) {
    const asOf = new Date();
    const [leaves, user] = await Promise.all([
        prisma.leave.findMany({
            where: { userId },
            orderBy: { startDate: "desc" },
        }),
        prisma.user.findUnique({
            where: { id: userId },
            select: {
                profile: { select: { joinDate: true } },
            },
        }),
    ]);

    const join = parseJoinCalendarDate(user?.profile?.joinDate ?? null);
    const period = join ? getLeavePeriod(join, asOf) : null;

    const inCurrentPeriod = (l: { startDate: Date; endDate: Date }) =>
        !period ||
        leaveOverlapsPeriod(l.startDate, l.endDate, period.periodStart, period.periodEnd);

    const approved = leaves.filter((l) => l.status === "APPROVED" && inCurrentPeriod(l));
    const pending = leaves.filter((l) => l.status === "PENDING" && inCurrentPeriod(l));

    const usedDays = approved.reduce(
        (sum, leave) => sum + countInclusiveDays(leave.startDate, leave.endDate),
        0
    );

    const pendingDays = pending.reduce(
        (sum, leave) => sum + countInclusiveDays(leave.startDate, leave.endDate),
        0
    );

    const annualQuota = LEAVE_QUOTA_BY_ROLE[role] ?? 22;
    const proration = computeProratedLeaveQuota(annualQuota, join);
    const total = proration.entitled;

    return {
        total,
        annualQuota: proration.annualQuota,
        isProrated: proration.isProrated,
        joinDate: proration.joinDate,
        monthsCredited: proration.monthsCredited,
        nextAnniversary: proration.nextAnniversary,
        used: usedDays,
        pending: pendingDays,
        remaining: Math.max(0, Math.round((total - usedDays) * 10) / 10),
        byType: {
            casual: approved.filter((l) => l.type === "CASUAL").length,
            sick: approved.filter((l) => l.type === "SICK").length,
        },
    };
}
