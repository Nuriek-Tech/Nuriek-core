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
        const leaves = await prisma.leave.findMany({
            where: { userId: (session.user as any).id },
            orderBy: { startDate: 'desc' },
        });

        return NextResponse.json(leaves);
    } catch (error) {
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    try {
        const body = await req.json();
        const { type, startDate, endDate, reason } = body;

        if (!type || !startDate || !endDate) {
            return new NextResponse("Missing required fields", { status: 400 });
        }

        const leave = await prisma.leave.create({
            data: {
                userId: (session.user as any).id,
                type,
                startDate: new Date(startDate),
                endDate: new Date(endDate),
                reason,
                status: "PENDING",
            }
        });

        return NextResponse.json(leave);
    } catch (error) {
        console.error("Leave request error:", error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}
