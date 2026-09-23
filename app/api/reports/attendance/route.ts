import { NextResponse } from "next/server";
import { Prisma, UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ROLES, REPORT_ROLES } from "@/lib/constants";
import { requireSession, isNextResponse } from "@/lib/rbac";

export async function GET(req: Request) {
    const session = await requireSession();
    if (isNextResponse(session)) return session;

    if (!REPORT_ROLES.includes(session.role)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const month = searchParams.get("month");
    const userId = searchParams.get("userId");
    const status = searchParams.get("status");
    const role = searchParams.get("role");
    const department = searchParams.get("department");

    try {
        const where: Prisma.AttendanceWhereInput = {};
        if (session.role === ROLES.MANAGER) where.user = { reportsToId: session.id };

        if (month) {
            const [year, monthNum] = month.split("-").map(Number);
            const startDate = new Date(year, monthNum - 1, 1);
            const endDate = new Date(year, monthNum, 0, 23, 59, 59, 999);
            where.checkIn = { gte: startDate, lte: endDate };
        }

        if (userId) where.userId = userId;
        if (status) where.status = status;
        if (role || department) {
            where.user = where.user ?? {};
            if (role) where.user.role = role as UserRole;
            if (department) {
                where.user.profile = {
                    department:
                        department === "Unassigned"
                            ? { equals: null }
                            : department,
                };
            }
        }

        const attendance = await prisma.attendance.findMany({
            where,
            include: {
                user: {
                    select: {
                        name: true,
                        email: true,
                        role: true,
                        profile: { select: { department: true, position: true } },
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
