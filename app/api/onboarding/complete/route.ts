import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, isNextResponse } from "@/lib/rbac";
import { ROLES } from "@/lib/constants";

export async function POST() {
    const user = await requireSession();
    if (isNextResponse(user)) return user;

    try {
        const existing = await prisma.user.findUnique({ where: { id: user.id }, select: { onboardingStatus: true } });
        if (!existing) return NextResponse.json({ error: "Employee not found" }, { status: 404 });
        const updated = existing.onboardingStatus === "COMPLETED"
            ? { id: user.id, onboardingStatus: "COMPLETED" }
            : await prisma.$transaction(async tx => {
                const result = await tx.user.update({ where: { id: user.id }, data: { onboardingStatus: "COMPLETED" }, select: { id: true, onboardingStatus: true } });
                await tx.auditLog.create({ data: { actorId: user.id, actorEmail: user.email, action: "USER_ONBOARDING_COMPLETED", entity: "User", entityId: user.id } });
                return result;
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
