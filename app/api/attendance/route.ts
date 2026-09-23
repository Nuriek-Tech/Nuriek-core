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
            take: 30
        });

        return NextResponse.json(logs);
    } catch {
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}

export async function POST() {
    return NextResponse.json({ error: "Use the check-in action to record attendance" }, { status: 405 });
}
