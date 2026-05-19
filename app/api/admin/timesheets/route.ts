import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRoles, isNextResponse } from "@/lib/rbac";
import { ADMIN_ROLES } from "@/lib/constants";

export async function GET() {
    const user = await requireRoles(ADMIN_ROLES);
    if (isNextResponse(user)) return user;

    try {
        const timesheets = await prisma.timesheet.findMany({
            include: {
                user: {
                    select: {
                        name: true,
                        email: true,
                        image: true,
                    }
                }
            },
            orderBy: { createdAt: 'desc' },
            take: 100
        });

        return NextResponse.json(timesheets);
    } catch (error) {
        console.error("Admin timesheets fetch error:", error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}
