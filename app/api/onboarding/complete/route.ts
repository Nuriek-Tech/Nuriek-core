import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, isNextResponse } from "@/lib/rbac";
import { ROLES } from "@/lib/constants";

export async function POST() {
    const user = await requireSession();
    if (isNextResponse(user)) return user;

    try {
        const updated = await prisma.user.update({
            where: { id: user.id },
            data: { onboardingStatus: "COMPLETED" },
            select: { id: true, onboardingStatus: true },
        });

        return NextResponse.json(updated);
    } catch (error) {
        console.error("Onboarding complete error:", error);
        return NextResponse.json({ error: "Failed to update onboarding" }, { status: 500 });
    }
}

/** Intern-only: return whether welcome modal should show */
export async function GET() {
    const user = await requireSession();
    if (isNextResponse(user)) return user;

    const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { role: true, onboardingStatus: true, name: true },
    });

    if (!dbUser) {
        return NextResponse.json({ showWelcome: false });
    }

    const showWelcome =
        dbUser.role === ROLES.INTERN &&
        (dbUser.onboardingStatus === "IN_PROGRESS" ||
            dbUser.onboardingStatus === "NOT_STARTED");

    return NextResponse.json({
        showWelcome,
        name: dbUser.name,
        onboardingStatus: dbUser.onboardingStatus,
    });
}
