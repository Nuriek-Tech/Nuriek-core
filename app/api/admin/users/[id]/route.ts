import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRoles, isNextResponse } from "@/lib/rbac";
import { ADMIN_ROLES } from "@/lib/constants";
import {
    REPORTING_MANAGER_ROLES,
    reportingManagerDisplayName,
} from "@/lib/reporting-manager";
import { logAudit } from "@/lib/audit";

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await requireRoles(ADMIN_ROLES);
        if (isNextResponse(user)) return user;

        const { id } = await params;

        if (!id) {
            return new NextResponse("User ID is required", { status: 400 });
        }

        if (user.id === id) {
            return new NextResponse("Cannot delete your own account", { status: 400 });
        }

        await prisma.user.delete({
            where: { id },
        });

        return NextResponse.json({ success: true, message: "User deleted successfully" });
    } catch (error) {
        console.error("Failed to delete user:", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const actor = await requireRoles(ADMIN_ROLES);
    if (isNextResponse(actor)) return actor;

    const { id } = await params;
    if (!id) {
        return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    try {
        const body = await req.json();
        const reportsToId =
            body.reportsToId === null || body.reportsToId === ""
                ? null
                : String(body.reportsToId);

        if (reportsToId === id) {
            return NextResponse.json(
                { error: "A user cannot report to themselves" },
                { status: 400 }
            );
        }

        if (reportsToId) {
            const manager = await prisma.user.findUnique({
                where: { id: reportsToId },
                select: { id: true, role: true, name: true, email: true },
            });
            if (!manager) {
                return NextResponse.json({ error: "Reporting manager not found" }, { status: 404 });
            }
            if (!REPORTING_MANAGER_ROLES.includes(manager.role as (typeof REPORTING_MANAGER_ROLES)[number])) {
                return NextResponse.json(
                    { error: "Selected user cannot be a reporting manager" },
                    { status: 400 }
                );
            }
        }

        const updated = await prisma.user.update({
            where: { id },
            data: { reportsToId },
            select: {
                id: true,
                reportsToId: true,
                reportsTo: { select: { id: true, name: true, email: true, role: true } },
            },
        });

        await logAudit({
            actorId: actor.id,
            actorEmail: actor.email,
            action: "USER_REPORTING_MANAGER_UPDATE",
            entity: "User",
            entityId: id,
            metadata: {
                reportsToId,
                managerName: reportingManagerDisplayName(updated.reportsTo),
            },
        });

        return NextResponse.json({
            id: updated.id,
            reportsToId: updated.reportsToId,
            reportsTo: updated.reportsTo
                ? {
                      id: updated.reportsTo.id,
                      name: updated.reportsTo.name,
                      email: updated.reportsTo.email,
                      role: updated.reportsTo.role,
                      displayName: reportingManagerDisplayName(updated.reportsTo),
                  }
                : null,
        });
    } catch (error) {
        console.error("Failed to update reporting manager:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
