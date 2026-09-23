import { NextResponse } from "next/server";
import { requireHrPermission, isNextResponse } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const user = await requireHrPermission("directory");
    if (isNextResponse(user)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await req.json().catch(() => ({}));
        const reason = typeof body.reason === "string" ? body.reason.trim() : "";
        if (!reason || reason.length > 500) return NextResponse.json({ error: "Provide an exit reason (up to 500 characters)." }, { status: 400 });
        const targetUserId = id;

        const targetUser = await prisma.user.findUnique({
            where: { id: targetUserId },
        });

        if (!targetUser) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        if (targetUser.role === "FOUNDER") {
            return NextResponse.json({ error: "Cannot offboard a FOUNDER" }, { status: 403 });
        }

        if (!targetUser.isActive) {
            // If already inactive, return success so frontend can still show the offboarding checklist/letter generator
            return NextResponse.json({ success: true, alreadyInactive: true });
        }

        const exitedAt = new Date();
        await prisma.$transaction([
            prisma.user.update({ where: { id: targetUserId }, data: { isActive: false } }),
            prisma.loginSession.updateMany({ where: { userId: targetUserId, logoutAt: null }, data: { logoutAt: exitedAt, endReason: "revoked" } }),
            prisma.auditLog.create({ data: { actorId: user.id, actorEmail: user.email, action: "EMPLOYEE_EXITED", entity: "User", entityId: targetUserId, metadata: JSON.stringify({ targetEmail: targetUser.email, reason }), createdAt: exitedAt } }),
        ]);
        return NextResponse.json({ success: true, exitedAt: exitedAt.toISOString() });
    } catch (error) {
        console.error("User exit error:", error);
        return NextResponse.json({ error: "Failed to process exit" }, { status: 500 });
    }
}
