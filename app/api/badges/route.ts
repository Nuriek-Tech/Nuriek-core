import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ROLES } from "@/lib/constants";

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    const role = (session?.user as any)?.role;

    // Only Admin/HR can award badges
    if (![ROLES.FOUNDER, ROLES.HR_ADMIN].includes(role)) {
        return new NextResponse("Unauthorized", { status: 403 });
    }

    try {
        const body = await req.json();
        const { userId, name, icon } = body;

        const badge = await prisma.badge.create({
            data: {
                userId,
                name,
                icon: icon || "Award",
                awardedBy: session?.user?.name || "Admin"
            }
        });

        return NextResponse.json(badge);
    } catch (error) {
        return new NextResponse("Internal Error", { status: 500 });
    }
}

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) return new NextResponse("UserId required", { status: 400 });

    const badges = await prisma.badge.findMany({
        where: { userId },
        orderBy: { awardedAt: "desc" }
    });

    return NextResponse.json(badges);
}
