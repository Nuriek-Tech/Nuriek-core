import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    const userId = (session.user as any).id;

    try {
        const [attendanceCount, timesheetHours, leaves] = await Promise.all([
            prisma.attendance.count({
                where: { userId, status: { not: "ABSENT" } }
            }),
            prisma.timesheet.aggregate({
                where: { userId },
                _sum: { hours: true }
            }),
            prisma.leave.findMany({
                where: { userId, status: "APPROVED" }
            })
        ]);

        const lateMarks = await prisma.attendance.count({
            where: { userId, status: "LATE" }
        });

        // Simple summary aggregation
        const stats = {
            presentDays: attendanceCount,
            totalHoursWorked: timesheetHours._sum.hours || 0,
            lateMarks,
            leaveBalanceUsed: leaves.length,
            disciplineScore: Math.max(0, 100 - (lateMarks * 10))
        };

        return NextResponse.json(stats);
    } catch (error) {
        return new NextResponse("Internal Error", { status: 500 });
    }
}
