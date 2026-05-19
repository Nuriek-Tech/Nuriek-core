import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { REPORT_ROLES } from "@/lib/constants";
import { requireRoles, isNextResponse } from "@/lib/rbac";
import { monthRange } from "@/lib/reports-analytics";

export async function GET(req: Request) {
    const user = await requireRoles(REPORT_ROLES);
    if (isNextResponse(user)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const month =
        searchParams.get("month") || new Date().toISOString().slice(0, 7);
    const range = monthRange(month);
    if (!range) {
        return NextResponse.json({ error: "Invalid month format" }, { status: 400 });
    }

    try {
        const attendance = await prisma.attendance.findMany({
            where: {
                checkIn: { gte: range.start, lte: range.end },
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        role: true,
                        profile: { select: { department: true } },
                    },
                },
            },
        });

        const leaves = await prisma.leave.findMany({
            where: {
                OR: [
                    { startDate: { gte: range.start, lte: range.end } },
                    { endDate: { gte: range.start, lte: range.end } },
                ],
            },
            include: {
                user: {
                    select: {
                        profile: { select: { department: true } },
                    },
                },
            },
        });

        const statusBreakdown: Record<string, number> = {};
        for (const a of attendance) {
            const key = a.status || "UNKNOWN";
            statusBreakdown[key] = (statusBreakdown[key] || 0) + 1;
        }

        const leaveByStatus: Record<string, number> = {};
        const leaveByType: Record<string, number> = {};
        for (const l of leaves) {
            leaveByStatus[l.status] = (leaveByStatus[l.status] || 0) + 1;
            leaveByType[l.type] = (leaveByType[l.type] || 0) + 1;
        }

        const deptMap = new Map<
            string,
            { department: string; records: number; late: number }
        >();
        for (const a of attendance) {
            const dept = a.user.profile?.department || "Unassigned";
            const cur = deptMap.get(dept) || { department: dept, records: 0, late: 0 };
            cur.records += 1;
            if (a.status === "LATE") cur.late += 1;
            deptMap.set(dept, cur);
        }

        const lateByUser = new Map<
            string,
            { userId: string; name: string; lateCount: number }
        >();
        for (const a of attendance) {
            if (a.status !== "LATE") continue;
            const cur = lateByUser.get(a.userId) || {
                userId: a.userId,
                name: a.user.name || "Unknown",
                lateCount: 0,
            };
            cur.lateCount += 1;
            lateByUser.set(a.userId, cur);
        }

        const topLate = [...lateByUser.values()]
            .sort((a, b) => b.lateCount - a.lateCount)
            .slice(0, 5);

        let totalHours = 0;
        let completedSessions = 0;
        for (const a of attendance) {
            if (a.checkOut) {
                totalHours +=
                    (a.checkOut.getTime() - a.checkIn.getTime()) / (1000 * 60 * 60);
                completedSessions += 1;
            }
        }

        return NextResponse.json({
            month,
            statusBreakdown,
            leaveByStatus,
            leaveByType,
            departmentStats: [...deptMap.values()].sort((a, b) => b.records - a.records),
            topLateEmployees: topLate,
            avgHoursPerSession:
                completedSessions > 0
                    ? Math.round((totalHours / completedSessions) * 10) / 10
                    : 0,
            totalAttendanceRecords: attendance.length,
            totalLeaveRecords: leaves.length,
        });
    } catch (error) {
        console.error("Reports Analytics API Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
