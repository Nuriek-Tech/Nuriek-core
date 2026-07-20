import { NextResponse } from "next/server";
import { requireHrPermission, isNextResponse } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

export async function POST(
    req: Request,
    { params }: { params: { id: string } }
) {
    const user = await requireHrPermission("manage_users");
    if (isNextResponse(user)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const targetUserId = params.id;

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
            return NextResponse.json({ error: "User is already inactive" }, { status: 400 });
        }

        // Mark user as inactive
        await prisma.user.update({
            where: { id: targetUserId },
            data: { isActive: false },
        });

        // Terminate all active sessions
        await prisma.loginSession.updateMany({
            where: {
                userId: targetUserId,
                logoutAt: null,
            },
            data: {
                logoutAt: new Date(),
                endReason: "revoked",
            },
        });

        // Log Audit Event
        await logAudit({
            actorId: user.id,
            actorEmail: user.email,
            action: "EMPLOYEE_EXITED",
            entity: "User",
            entityId: targetUserId,
            metadata: { targetEmail: targetUser.email },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("User exit error:", error);
        return NextResponse.json({ error: "Failed to process exit" }, { status: 500 });
    }
}
