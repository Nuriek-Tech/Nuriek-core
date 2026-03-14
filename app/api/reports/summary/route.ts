import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ROLES } from "@/lib/constants";

export async function GET() {
    const session = await getServerSession(authOptions);

    if (!session || !([ROLES.FOUNDER, ROLES.HR_ADMIN, ROLES.MANAGER] as string[]).includes((session.user as { role: string }).role)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const totalEmployees = await prisma.user.count();

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const checkedInToday = await prisma.attendance.count({
            where: {
                checkIn: {
                    gte: today
                }
            }
        });

        const onLeaveToday = await prisma.leave.count({
            where: {
                startDate: {
                    lte: new Date()
                },
                endDate: {
                    gte: new Date()
                },
                status: "APPROVED"
            }
        });

        const pendingLeaves = await prisma.leave.count({
            where: {
                status: "PENDING"
            }
        });

        return NextResponse.json({
            totalEmployees,
            checkedInToday,
            onLeaveToday,
            pendingLeaves,
            attendanceRate: totalEmployees > 0 ? (checkedInToday / totalEmployees) * 100 : 0
        });
    } catch (error) {
        console.error("Reports Summary API Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
