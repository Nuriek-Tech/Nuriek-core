import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ADMIN_ROLES, DIRECTORY_ROLES, ROLES } from "@/lib/constants";
import { requireRoles, isNextResponse } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";

export async function GET() {
    const user = await requireRoles(DIRECTORY_ROLES);
    if (isNextResponse(user)) return user;

    try {
        const users = await prisma.user.findMany({
            select: {
                id: true,
                name: true,
                email: true,
                personalEmail: true,
                role: true,
                createdAt: true,
                reportsToId: true,
                reportsTo: {
                    select: { id: true, name: true, email: true, role: true },
                },
                profile: {
                    select: {
                        position: true,
                        department: true,
                        joinDate: true,
                    },
                },
            },
            orderBy: { name: "asc" },
        });

        return NextResponse.json(users);
    } catch (error) {
        console.error("Error fetching users:", error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}

export async function DELETE(req: Request) {
    const current = await requireRoles(ADMIN_ROLES);
    if (isNextResponse(current)) return current;

    try {
        const body = await req.json();
        const { userId } = body;

        if (!userId) {
            return new NextResponse("User ID required", { status: 400 });
        }

        const userToDelete = await prisma.user.findUnique({
            where: { id: userId },
            select: { role: true, email: true },
        });

        if (!userToDelete) {
            return new NextResponse("User not found", { status: 404 });
        }

        if (
            current.role === ROLES.HR_ADMIN &&
            ADMIN_ROLES.includes(userToDelete.role as (typeof ADMIN_ROLES)[number])
        ) {
            return new NextResponse("Cannot delete admin users", { status: 403 });
        }

        await prisma.user.delete({ where: { id: userId } });

        await logAudit({
            actorId: current.id,
            actorEmail: current.email,
            action: "USER_DELETE",
            entity: "User",
            entityId: userId,
            metadata: { deletedEmail: userToDelete.email },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Delete user error:", error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}
