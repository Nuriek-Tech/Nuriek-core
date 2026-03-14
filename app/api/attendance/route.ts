import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    try {
        const logs = await prisma.attendance.findMany({
            where: { userId: (session.user as any).id },
            orderBy: { checkIn: 'desc' },
            take: 5
        });

        return NextResponse.json(logs);
    } catch (error) {
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}

export async function POST() {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    try {
        const log = await prisma.attendance.create({
            data: {
                userId: (session.user as any).id,
                status: "ON_TIME",
                checkIn: new Date(),
            }
        });

        return NextResponse.json(log);
    } catch (error) {
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}
