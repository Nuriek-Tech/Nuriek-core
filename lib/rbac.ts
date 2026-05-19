import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ROLES, type Role, isSuperAdminRole } from "@/lib/constants";
import { hasAnyRole, normalizeRole } from "@/lib/roles";
import { type HrPermission, hasHrPermission } from "@/lib/hr-permissions";

export type SessionUser = {
    id: string;
    email?: string | null;
    name?: string | null;
    role: Role;
    mustChangePassword: boolean;
    hrPermissions?: string | null;
};

async function resolveUserFromDb(email?: string | null, id?: string | null) {
    if (id) {
        return prisma.user.findUnique({
            where: { id },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                mustChangePassword: true,
                hrPermissions: true,
            },
        });
    }
    if (email) {
        return prisma.user.findUnique({
            where: { email },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                mustChangePassword: true,
                hrPermissions: true,
            },
        });
    }
    return null;
}

export async function getSessionUser(): Promise<SessionUser | null> {
    const session = await getServerSession(authOptions);
    if (!session?.user) return null;

    const dbUser = await resolveUserFromDb(session.user.email, session.user.id);

    if (dbUser) {
        return {
            id: dbUser.id,
            email: dbUser.email,
            name: dbUser.name,
            role: normalizeRole(dbUser.role) ?? ROLES.EMPLOYEE,
            mustChangePassword: dbUser.mustChangePassword,
            hrPermissions: dbUser.hrPermissions,
        };
    }

    if (!session.user.id) return null;

    return {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        role: normalizeRole(session.user.role) ?? ROLES.EMPLOYEE,
        mustChangePassword: session.user.mustChangePassword ?? false,
        hrPermissions: null,
    };
}

export function unauthorized(message = "Unauthorized") {
    return NextResponse.json({ error: message }, { status: 401 });
}

export function forbidden(message = "Forbidden") {
    return NextResponse.json({ error: message }, { status: 403 });
}

export async function requireSession(): Promise<SessionUser | NextResponse> {
    const user = await getSessionUser();
    if (!user) return unauthorized();
    return user;
}

export async function requireRoles(
    allowed: readonly Role[]
): Promise<SessionUser | NextResponse> {
    const result = await requireSession();
    if (result instanceof NextResponse) return result;

    if (!hasAnyRole(result.role, allowed)) {
        return forbidden(
            `This action requires one of: ${allowed.join(", ")}. Your role is ${result.role}.`
        );
    }
    return result;
}

export async function requireSuperAdmin(): Promise<SessionUser | NextResponse> {
    const result = await requireSession();
    if (result instanceof NextResponse) return result;
    if (!isSuperAdminRole(result.role)) {
        return forbidden("Super Admin access only.");
    }
    return result;
}

/** @deprecated Use requireSuperAdmin */

export async function requireHrPermission(
    permission: HrPermission
): Promise<SessionUser | NextResponse> {
    const result = await requireSession();
    if (result instanceof NextResponse) return result;

    if (isSuperAdminRole(result.role)) return result;

    const dbUser = await prisma.user.findUnique({
        where: { id: result.id },
        select: { hrPermissions: true, role: true },
    });
    const role = normalizeRole(dbUser?.role ?? result.role) ?? ROLES.EMPLOYEE;

    if (hasHrPermission(role, dbUser?.hrPermissions ?? result.hrPermissions, permission)) {
        return { ...result, role, hrPermissions: dbUser?.hrPermissions ?? result.hrPermissions };
    }

    return forbidden(`Missing permission: ${permission}`);
}

export function isNextResponse(value: unknown): value is NextResponse {
    return value instanceof NextResponse;
}
