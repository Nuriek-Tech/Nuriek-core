import { ROLES, type Role } from "@/lib/constants";

/** User-facing role labels (internal enum may differ). */
export const ROLE_LABELS: Record<Role, string> = {
    [ROLES.FOUNDER]: "Super Admin",
    [ROLES.HR_ADMIN]: "HR Admin",
    [ROLES.MANAGER]: "Manager",
    [ROLES.TEAM_LEAD]: "Team Lead",
    [ROLES.EMPLOYEE]: "Employee",
    [ROLES.INTERN]: "Intern",
    [ROLES.CONTRACTOR]: "Contractor",
};

export function formatRoleLabel(role: string | null | undefined): string {
    const normalized = normalizeRole(role);
    if (normalized) return ROLE_LABELS[normalized];
    if (!role) return "Team member";
    return role.replace(/_/g, " ");
}

const ROLE_ALIASES: Record<string, Role> = {
    SUPER_ADMIN: ROLES.FOUNDER,
    ADMIN: ROLES.FOUNDER,
    SUPERADMIN: ROLES.FOUNDER,
};

export function normalizeRole(value: string | null | undefined): Role | null {
    if (!value) return null;
    const key = value.trim().toUpperCase().replace(/\s+/g, "_");
    if (key in ROLES) return key as Role;
    return ROLE_ALIASES[key] ?? null;
}

export function hasAnyRole(
    role: string | null | undefined,
    allowed: readonly Role[]
): boolean {
    const normalized = normalizeRole(role);
    if (!normalized) return false;
    return allowed.includes(normalized);
}
