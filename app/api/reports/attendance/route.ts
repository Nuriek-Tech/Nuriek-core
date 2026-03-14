import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ROLES } from "@/lib/constants";

export async function GET(req: Request) {
    const session = await getServerSession(authOptions);

    if (!session || !([ROLES.FOUNDER, ROLES.HR_ADMIN, ROLES.MANAGER] as string[]).includes((session.user as { role: string }).role)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const month = searchParams.get("month"); // Format: YYYY-MM
    const userId = searchParams.get("userId");

    try {
        const where: { checkIn?: { gte: Date; lte: Date }; userId?: string } = {};

        if (month) {
            const [year, monthNum] = month.split("-").map(Number);
            const startDate = new Date(year, monthNum - 1, 1);
            const endDate = new Date(year, monthNum, 0, 23, 59, 59);
            where.checkIn = {
                gte: startDate,
                lte: endDate,
            };
        }

        if (userId) {
            where.userId = userId;
        }

        const attendance = await prisma.attendance.findMany({
            where,
            include: {
                user: {
                    select: {
                        name: true,
                        email: true,
                        role: true,
                    },
                },
            },
            orderBy: {
                checkIn: "desc",
            },
        });

        return NextResponse.json(attendance);
    } catch (error) {
        console.error("Attendance Report API Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
