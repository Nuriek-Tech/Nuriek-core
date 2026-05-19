import { prisma } from "@/lib/prisma";
import { ROLES, type Role } from "@/lib/constants";
import { lastNDays } from "@/lib/reports-analytics";

/** Roles expected to check in (excludes Super Admin / HR Admin). */
export const WORKFORCE_ROLES: Role[] = [
    ROLES.EMPLOYEE,
    ROLES.TEAM_LEAD,
    ROLES.MANAGER,
    ROLES.INTERN,
    ROLES.CONTRACTOR,
];

/** Headcount on admin dashboard — employees & contractors, not interns. */
export const EMPLOYEE_HEADCOUNT_ROLES: Role[] = [
    ROLES.EMPLOYEE,
    ROLES.TEAM_LEAD,
    ROLES.MANAGER,
    ROLES.CONTRACTOR,
];

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

export function getISTDateParts(date = new Date()) {
    const ist = new Date(date.getTime() + IST_OFFSET_MS);
    return {
        year: ist.getUTCFullYear(),
        month: ist.getUTCMonth() + 1,
        day: ist.getUTCDate(),
    };
}

/** Start/end of a calendar day in India (Asia/Kolkata), as UTC Date values for DB queries. */
export function getISTDayBounds(date = new Date()) {
    const { year, month, day } = getISTDateParts(date);
    const start = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0) - IST_OFFSET_MS);
    const end = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999) - IST_OFFSET_MS);
    return { start, end };
}

export function getISTMonthBounds(date = new Date()) {
    const { year, month } = getISTDateParts(date);
    const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0) - IST_OFFSET_MS);
    const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const end = new Date(Date.UTC(year, month - 1, lastDay, 23, 59, 59, 999) - IST_OFFSET_MS);
    return { start, end, year, month, lastDay };
}

export function toISTDateKey(date: Date): string {
    const { year, month, day } = getISTDateParts(date);
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Weekday count (Mon–Fri) for month; optional cap at `upToDay` for month-to-date. */
export function countWorkingDays(year: number, month: number, upToDay?: number): number {
    const last = upToDay ?? new Date(year, month, 0).getDate();
    let n = 0;
    for (let d = 1; d <= last; d++) {
        const dow = new Date(year, month - 1, d).getDay();
        if (dow !== 0 && dow !== 6) n++;
    }
    return n;
}

export async function computeOrgDashboardSummary() {
    const { start: todayStart, end: todayEnd } = getISTDayBounds();

    const totalEmployees = await prisma.user.count({
        where: { role: { in: EMPLOYEE_HEADCOUNT_ROLES } },
    });

    const todayAttendance = await prisma.attendance.findMany({
        where: {
            checkIn: { gte: todayStart, lte: todayEnd },
            user: { role: { in: WORKFORCE_ROLES } },
        },
        select: { status: true, userId: true },
    });

    const checkedInUserIds = new Set(todayAttendance.map((a) => a.userId));
    const checkedInToday = checkedInUserIds.size;
    const lateToday = todayAttendance.filter((a) => a.status === "LATE").length;

    const leavesToday = await prisma.leave.findMany({
        where: {
            status: "APPROVED",
            startDate: { lte: todayEnd },
            endDate: { gte: todayStart },
            user: { role: { in: WORKFORCE_ROLES } },
        },
        select: { userId: true },
    });
    const onLeaveUserIds = new Set(leavesToday.map((l) => l.userId));
    const onLeaveToday = onLeaveUserIds.size;

    const onLeaveNotCheckedIn = [...onLeaveUserIds].filter((id) => !checkedInUserIds.has(id)).length;
    const expectedInOffice = Math.max(0, totalEmployees - onLeaveNotCheckedIn);
    const attendanceRate =
        expectedInOffice > 0 ? (checkedInToday / expectedInOffice) * 100 : 0;
    const absentEstimate = Math.max(0, expectedInOffice - checkedInToday);

    const [pendingLeaves, pendingCertificates, pendingTimesheets] = await Promise.all([
        prisma.leave.count({ where: { status: "PENDING" } }),
        prisma.certificateRequest.count({ where: { status: "PENDING" } }),
        prisma.timesheet.count({ where: { status: "SUBMITTED" } }),
    ]);

    const weeklyTrend = await Promise.all(
        lastNDays(7).map(async (day) => {
            const { start, end } = getISTDayBounds(day.start);
            const count = await prisma.attendance.count({
                where: {
                    checkIn: { gte: start, lte: end },
                    user: { role: { in: WORKFORCE_ROLES } },
                },
            });
            return { label: day.label, count };
        })
    );

    return {
        totalEmployees,
        checkedInToday,
        onLeaveToday,
        pendingLeaves,
        pendingCertificates,
        pendingTimesheets,
        lateToday,
        absentEstimate,
        expectedInOffice,
        attendanceRate,
        weeklyTrend,
    };
}

export async function computeUserMonthlyStats(userId: string) {
    const { start, end, year, month, lastDay } = getISTMonthBounds();
    const { day: todayDay } = getISTDateParts();

    const [logs, timesheetHours, approvedLeaves] = await Promise.all([
        prisma.attendance.findMany({
            where: { userId, checkIn: { gte: start, lte: end } },
            select: { checkIn: true, status: true },
        }),
        prisma.timesheet.aggregate({
            where: {
                userId,
                date: { gte: start, lte: end },
            },
            _sum: { hours: true },
        }),
        prisma.leave.count({
            where: {
                userId,
                status: "APPROVED",
                startDate: { lte: end },
                endDate: { gte: start },
            },
        }),
    ]);

    const presentDays = new Set(logs.map((l) => toISTDateKey(l.checkIn))).size;
    const lateMarks = logs.filter((l) => l.status === "LATE").length;
    const workingDaysElapsed = countWorkingDays(year, month, todayDay);
    const totalDays = countWorkingDays(year, month, lastDay);

    const missedWorkingDays = Math.max(0, workingDaysElapsed - presentDays);
    const disciplineScore = Math.max(
        0,
        Math.min(100, 100 - lateMarks * 8 - missedWorkingDays * 4)
    );

    return {
        presentDays,
        lateMarks,
        disciplineScore,
        totalDays,
        workingDaysElapsed,
        totalHoursWorked: timesheetHours._sum.hours ?? 0,
        leaveDaysThisMonth: approvedLeaves,
    };
}
