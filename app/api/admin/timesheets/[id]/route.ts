import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRoles, isNextResponse } from "@/lib/rbac";
import { ADMIN_ROLES } from "@/lib/constants";

export async function PATCH(
    req: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    const params = await props.params;
    const user = await requireRoles(ADMIN_ROLES);
    if (isNextResponse(user)) return user;

    try {
        const body = await req.json();
        const { status } = body;

        if (!status || !["APPROVED", "REJECTED"].includes(status)) {
            return new NextResponse("Invalid status", { status: 400 });
        }

        const timesheet = await prisma.timesheet.update({
            where: { id: params.id },
            data: { status }
        });

        return NextResponse.json(timesheet);
    } catch (error) {
        console.error("Timesheet status update error:", error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}
