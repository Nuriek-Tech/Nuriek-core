import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return new NextResponse("Unauthorized", { status: 401 });

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId") || (session.user as any).id;

    try {
        const performance = await (prisma as any).internPerformance.findUnique({
            where: { userId },
            include: { user: true }
        });

        if (!performance && (session.user as any).role === "INTERN") {
            // Return default for interns if not found
            return NextResponse.json({
                learningProgress: 0,
                taskCompletion: 0,
                score: 0,
                conversionRisk: "LOW",
                onboardingData: "[]"
            });
        }

        return NextResponse.json(performance);
    } catch (error) {
        return new NextResponse("Internal Error", { status: 500 });
    }
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!["HR_HEAD", "FOUNDER", "DIRECTOR"].includes((session?.user as any)?.role)) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    try {
        const body = await req.json();
        const performance = await (prisma as any).internPerformance.upsert({
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
    } catch (error) {
        return new NextResponse("Internal Error", { status: 500 });
    }
}
