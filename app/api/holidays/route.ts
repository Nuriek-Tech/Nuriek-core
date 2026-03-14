import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ROLES } from "@/lib/constants";

export async function GET() {
    try {
        const holidays = await (prisma as any).holiday.findMany({
            orderBy: { date: "asc" }
        });
        return NextResponse.json(holidays);
    } catch (error) {
        return new NextResponse("Internal Error", { status: 500 });
    }
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role;
    
    if (userRole !== ROLES.HR_ADMIN && userRole !== ROLES.FOUNDER) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    try {
        const body = await req.json();
        const holiday = await (prisma as any).holiday.create({
            data: {
                name: body.name,
                date: new Date(body.date),
                type: body.type || "PUBLIC"
            }
        });
        return NextResponse.json(holiday);
    } catch (error) {
        return new NextResponse("Internal Error", { status: 500 });
    }
}

export async function DELETE(req: Request) {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role;
    
    if (userRole !== ROLES.HR_ADMIN && userRole !== ROLES.FOUNDER) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    try {
        const { id } = await req.json();
        await (prisma as any).holiday.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (error) {
        return new NextResponse("Internal Error", { status: 500 });
    }
}
