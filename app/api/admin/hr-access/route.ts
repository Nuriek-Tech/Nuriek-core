import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin, isNextResponse } from "@/lib/rbac";
import {
    HR_PERMISSIONS,
    type HrPermission,
    parseStoredHrPermissions,
    getEffectiveHrPermissions,
    HR_ACCESS_ROLES,
    HR_TEAM_EMAILS,
    isHrProfileUser,
    canReceiveHrGrants,
} from "@/lib/hr-permissions";
import { logAudit } from "@/lib/audit";
import { normalizeRole } from "@/lib/roles";
import { ROLES, type Role, isSuperAdminRole } from "@/lib/constants";

function mapHrUser(
    u: {
        id: string;
        name: string | null;
        email: string | null;
        role: string;
        hrPermissions: string | null;
        profile: { department: string | null; position: string | null } | null;
    }
) {
    const role = normalizeRole(u.role) as Role;
    return {
        id: u.id,
        name: u.name,
        email: u.email,
        role,
        department: u.profile?.department ?? null,
        position: u.profile?.position ?? null,
        isHrProfile: isHrProfileUser(u),
        stored: parseStoredHrPermissions(u.hrPermissions),
        effective: getEffectiveHrPermissions(role, u.hrPermissions),
    };
}

const hrUserSelect = {
    id: true,
    name: true,
    email: true,
    role: true,
    hrPermissions: true,
    profile: { select: { department: true, position: true } },
} as const;

async function fetchHrAccessUsers() {
    const [byRoleOrProfile, byEmail] = await Promise.all([
        prisma.user.findMany({
            where: {
                role: { not: ROLES.FOUNDER },
                OR: [
                    { role: { in: HR_ACCESS_ROLES } },
                    { profile: { department: { contains: "hr", mode: "insensitive" } } },
                    { profile: { position: { contains: "hr", mode: "insensitive" } } },
                ],
            },
            select: hrUserSelect,
        }),
        prisma.user.findMany({
            where: {
                role: { not: ROLES.FOUNDER },
                email: { in: [...HR_TEAM_EMAILS] },
            },
            select: hrUserSelect,
        }),
    ]);

    const merged = new Map<string, (typeof byRoleOrProfile)[number]>();
    for (const u of [...byRoleOrProfile, ...byEmail]) {
        merged.set(u.id, u);
    }

    return [...merged.values()].sort((a, b) => {
        const nameA = (a.name ?? a.email ?? "").toLowerCase();
        const nameB = (b.name ?? b.email ?? "").toLowerCase();
        return nameA.localeCompare(nameB);
    });
}

export async function GET() {
    const superAdmin = await requireSuperAdmin();
    if (isNextResponse(superAdmin)) return superAdmin;

    try {
        const users = await fetchHrAccessUsers();

        const directory = await prisma.user.findMany({
            where: { role: { not: ROLES.FOUNDER } },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                profile: { select: { department: true, position: true } },
            },
            orderBy: { name: "asc" },
        });

        const listedIds = new Set(users.map((u) => u.id));
        const addable = directory
            .filter((u) => !listedIds.has(u.id))
            .map((u) => ({
                id: u.id,
                name: u.name,
                email: u.email,
                role: normalizeRole(u.role),
                department: u.profile?.department ?? null,
                position: u.profile?.position ?? null,
            }));

        return NextResponse.json({
            permissions: HR_PERMISSIONS,
            users: users.map(mapHrUser),
            addable,
        });
    } catch (error) {
        console.error("HR access list:", error);
        return NextResponse.json({ error: "Failed to load HR access" }, { status: 500 });
    }
}

export async function PATCH(req: Request) {
    const superAdmin = await requireSuperAdmin();
    if (isNextResponse(superAdmin)) return superAdmin;

    try {
        const body = await req.json();
        const userId = body.userId as string | undefined;
        const permissions = body.permissions as unknown;
        const promoteToHrAdmin = body.promoteToHrAdmin === true;

        if (!userId || !Array.isArray(permissions)) {
            return NextResponse.json({ error: "userId and permissions[] required" }, { status: 400 });
        }

        const target = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                role: true,
                email: true,
                name: true,
                profile: { select: { department: true, position: true } },
            },
        });

        if (!target) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const role = normalizeRole(target.role) as Role;
        if (isSuperAdminRole(role)) {
            return NextResponse.json({ error: "Cannot change Super Admin access" }, { status: 400 });
        }

        if (!canReceiveHrGrants(role, target.profile)) {
            return NextResponse.json(
                {
                    error:
                        "User must be HR Admin, Manager, or in an HR department/position. Use “Add HR staff” first.",
                },
                { status: 400 }
            );
        }

        const cleaned = permissions.filter((k): k is HrPermission =>
            HR_PERMISSIONS.includes(k as HrPermission)
        );

        let nextRole = role;
        if (
            promoteToHrAdmin ||
            (cleaned.length > 0 &&
                role === ROLES.EMPLOYEE &&
                isHrProfileUser(target))
        ) {
            nextRole = ROLES.HR_ADMIN;
        }

        const updated = await prisma.user.update({
            where: { id: userId },
            data: {
                role: nextRole,
                hrPermissions: cleaned.length > 0 ? JSON.stringify(cleaned) : null,
            },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                hrPermissions: true,
                profile: { select: { department: true, position: true } },
            },
        });

        await logAudit({
            actorId: superAdmin.id,
            actorEmail: superAdmin.email,
            action: "HR_ACCESS_UPDATE",
            entity: "User",
            entityId: userId,
            metadata: {
                permissions: cleaned,
                targetEmail: target.email,
                role: nextRole,
            },
        });

        return NextResponse.json({ user: mapHrUser(updated) });
    } catch (error) {
        console.error("HR access update:", error);
        return NextResponse.json({ error: "Failed to update access" }, { status: 500 });
    }
}
