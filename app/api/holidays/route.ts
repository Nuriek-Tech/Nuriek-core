import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRoles, isNextResponse } from "@/lib/rbac";
import { ADMIN_ROLES } from "@/lib/constants";

export async function GET() {
    try {
        const holidays = await prisma.holiday.findMany({
            orderBy: { date: "asc" }
        });
        return NextResponse.json(holidays);
    } catch {
        return new NextResponse("Internal Error", { status: 500 });
    }
}

export async function POST(req: Request) {
    const user = await requireRoles(ADMIN_ROLES);
    if (isNextResponse(user)) return user;

    try {
        const body = await req.json();
        const holiday = await prisma.holiday.create({
            data: {
                name: body.name,
                date: new Date(body.date),
                type: body.type || "PUBLIC"
            }
        });
        return NextResponse.json(holiday);
    } catch {
        return new NextResponse("Internal Error", { status: 500 });
    }
}

export async function DELETE(req: Request) {
    const user = await requireRoles(ADMIN_ROLES);
    if (isNextResponse(user)) return user;

    try {
        const { id } = await req.json();
        await prisma.holiday.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch {
        return new NextResponse("Internal Error", { status: 500 });
    }
}
