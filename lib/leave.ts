import { prisma } from "@/lib/prisma";
import type { Role } from "@/lib/constants";

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

export async function getLeaveBalance(userId: string, role: Role) {
    const leaves = await prisma.leave.findMany({
        where: { userId },
        orderBy: { startDate: "desc" },
    });

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

    const total = LEAVE_QUOTA_BY_ROLE[role] ?? 22;

    return {
        total,
        used: usedDays,
        pending: pendingDays,
        remaining: Math.max(0, total - usedDays),
        byType: {
            casual: approved.filter((l) => l.type === "CASUAL").length,
            sick: approved.filter((l) => l.type === "SICK").length,
        },
    };
}
