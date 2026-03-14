import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function PATCH(
    req: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    const params = await props.params;
    const session = await getServerSession(authOptions);
    
    if (!session?.user || !["FOUNDER", "HR_ADMIN"].includes((session.user as any).role)) {
        return new NextResponse("Unauthorized", { status: 403 });
    }

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
