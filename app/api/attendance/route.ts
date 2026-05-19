import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, isNextResponse } from "@/lib/rbac";

export async function GET() {
    const user = await requireSession();
    if (isNextResponse(user)) return user;

    try {
        const logs = await prisma.attendance.findMany({
            where: { userId: user.id },
            orderBy: { checkIn: 'desc' },
            take: 5
        });

        return NextResponse.json(logs);
    } catch {
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}

export async function POST() {
    const user = await requireSession();
    if (isNextResponse(user)) return user;

    try {
        const log = await prisma.attendance.create({
            data: {
                userId: user.id,
                status: "ON_TIME",
                checkIn: new Date(),
            }
        });

        return NextResponse.json(log);
    } catch {
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}
