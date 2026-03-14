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
    const status = searchParams.get("status");
    const userId = searchParams.get("userId");

    try {
        const where: { status?: string; userId?: string } = {};

        if (status) {
            where.status = status;
        }

        if (userId) {
            where.userId = userId;
        }

        const leaves = await prisma.leave.findMany({
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
                startDate: "desc",
            },
        });

        return NextResponse.json(leaves);
    } catch (error) {
        console.error("Leaves Report API Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
