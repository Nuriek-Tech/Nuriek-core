import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireHrPermission, isNextResponse } from "@/lib/rbac";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const actor = await requireHrPermission("directory");
    if (isNextResponse(actor)) return actor;
    const { id } = await params;
    const target = await prisma.user.findUnique({ where: { id }, select: { id: true, isActive: true, onboardingStatus: true } });
    if (!target) return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    if (!target.isActive) return NextResponse.json({ error: "Exited employees cannot complete onboarding" }, { status: 400 });
    if (target.onboardingStatus === "COMPLETED") return NextResponse.json({ success: true, alreadyCompleted: true });
    await prisma.$transaction(async tx => {
        await tx.user.update({ where: { id }, data: { onboardingStatus: "COMPLETED" } });
        await tx.auditLog.create({ data: { actorId: actor.id, actorEmail: actor.email, action: "USER_ONBOARDING_COMPLETED", entity: "User", entityId: id } });
    });
    return NextResponse.json({ success: true });
}
