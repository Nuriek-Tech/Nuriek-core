import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, requireSuperAdmin, isNextResponse } from "@/lib/rbac";
import { isSuperAdminRole } from "@/lib/constants";

export async function GET() {
    const user = await requireSession();
    if (isNextResponse(user)) return user;

    try {
        const holidays = await prisma.holiday.findMany({
            where: isSuperAdminRole(user.role)
                ? undefined
                : { publishedAt: { not: null } },
            orderBy: { date: "asc" },
        });
        return NextResponse.json(holidays);
    } catch {
        return new NextResponse("Internal Error", { status: 500 });
    }
}

/** Single holiday create — Super Admin only (use bulk upload for lists). */
export async function POST(req: Request) {
    const user = await requireSuperAdmin();
    if (isNextResponse(user)) return user;

    try {
        const body = await req.json();
        const holiday = await prisma.holiday.create({
            data: {
                name: body.name,
                date: new Date(body.date),
                type: body.type || "PUBLIC",
                publishedAt: new Date(),
            },
        });
        return NextResponse.json(holiday);
    } catch {
        return new NextResponse("Internal Error", { status: 500 });
    }
}

export async function DELETE(req: Request) {
    const user = await requireSuperAdmin();
    if (isNextResponse(user)) return user;

    try {
        const { id } = await req.json();
        await prisma.holiday.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch {
        return new NextResponse("Internal Error", { status: 500 });
    }
}
