import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, requireRoles, isNextResponse } from "@/lib/rbac";
import { ROLES } from "@/lib/constants";
import type { Role } from "@/lib/constants";

const PERFORMANCE_MANAGER_ROLES: Role[] = [
    ROLES.HR_ADMIN,
    ROLES.FOUNDER,
    ROLES.MANAGER,
    ROLES.TEAM_LEAD,
];

export async function GET(req: Request) {
    const user = await requireSession();
    if (isNextResponse(user)) return user;

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId") || user.id;

    try {
        const performance = await prisma.internPerformance.findUnique({
            where: { userId },
            include: { user: true }
        });

        if (!performance && user.role === ROLES.INTERN) {
            return NextResponse.json({
                learningProgress: 0,
                taskCompletion: 0,
                score: 0,
                conversionRisk: "LOW",
                onboardingData: "[]"
            });
        }

        return NextResponse.json(performance);
    } catch {
        return new NextResponse("Internal Error", { status: 500 });
    }
}

export async function POST(req: Request) {
    const user = await requireRoles(PERFORMANCE_MANAGER_ROLES);
    if (isNextResponse(user)) return user;

    try {
        const body = await req.json();
        const performance = await prisma.internPerformance.upsert({
            where: { userId: body.userId },
            update: {
                learningProgress: body.learningProgress,
                taskCompletion: body.taskCompletion,
                score: body.score,
                conversionRisk: body.conversionRisk,
                duration: body.duration,
                onboardingData: JSON.stringify(body.onboardingData)
            },
            create: {
                userId: body.userId,
                learningProgress: body.learningProgress,
                taskCompletion: body.taskCompletion,
                score: body.score,
                conversionRisk: body.conversionRisk,
                duration: body.duration,
                onboardingData: JSON.stringify(body.onboardingData)
            }
        });
        return NextResponse.json(performance);
    } catch {
        return new NextResponse("Internal Error", { status: 500 });
    }
}
