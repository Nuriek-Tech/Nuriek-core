import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRoles, isNextResponse } from "@/lib/rbac";
import { ROLES } from "@/lib/constants";
import type { Role } from "@/lib/constants";

const REVIEWER_ROLES: Role[] = [
    ROLES.FOUNDER,
    ROLES.HR_ADMIN,
    ROLES.MANAGER,
    ROLES.TEAM_LEAD,
];

export async function POST(req: Request) {
    const user = await requireRoles(REVIEWER_ROLES);
    if (isNextResponse(user)) return user;

    try {
        const body = await req.json();
        const { userId, rating, feedback } = body;

        const reviewer = await prisma.user.findUnique({
            where: { email: user.email! }
        });

        if (!reviewer) return new NextResponse("Reviewer not found", { status: 404 });

        const review = await prisma.performanceReview.create({
            data: {
                userId,
                reviewerId: reviewer.id,
                rating: parseInt(rating),
                feedback
            }
        });

        return NextResponse.json(review);
    } catch (error) {
        console.error("Review creation error:", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) return new NextResponse("UserId required", { status: 400 });

    const reviews = await prisma.performanceReview.findMany({
        where: { userId },
        include: { reviewer: { select: { name: true, role: true } } },
        orderBy: { createdAt: "desc" }
    });

    return NextResponse.json(reviews);
}
