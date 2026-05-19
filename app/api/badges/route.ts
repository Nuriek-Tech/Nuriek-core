import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRoles, isNextResponse } from "@/lib/rbac";
import { ADMIN_ROLES } from "@/lib/constants";

export async function POST(req: Request) {
    const user = await requireRoles(ADMIN_ROLES);
    if (isNextResponse(user)) return user;

    try {
        const body = await req.json();
        const { userId, name, icon } = body;

        const badge = await prisma.badge.create({
            data: {
                userId,
                name,
                icon: icon || "Award",
                awardedBy: user.name || "Admin"
            }
        });

        return NextResponse.json(badge);
    } catch {
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
