import { ROLES, type Role, isSuperAdminRole } from "@/lib/constants";

export const HR_PERMISSIONS = [
    "directory",
    "onboarding",
    "interns",
    "offer_letter",
    "admin_documents",
    "admin_timesheets",
    "employee_documents",
    "reports",
    "admin_settings",
] as const;

export type HrPermission = (typeof HR_PERMISSIONS)[number];

export const HR_PERMISSION_LABELS: Record<HrPermission, string> = {
    directory: "Employee directory",
    onboarding: "Onboard employees",
    interns: "Intern management",
    offer_letter: "Offer letter generator & workflow",
    admin_documents: "Admin documents (NDA / policies)",
    admin_timesheets: "Admin timesheets",
    employee_documents: "Per-employee documents",
    reports: "Operational reports",
    admin_settings: "HR admin settings (work hours)",
};

/** Always listed in Admin → HR access (even if profile/role metadata is incomplete). */
export const HR_TEAM_EMAILS = ["rekha@nuriek.com", "hr@nuriek.com"] as const;

/** Full module access for primary HR admins like Rekha. */
export const HR_ADMIN_DEFAULT_PERMISSIONS: HrPermission[] = [
    "directory",
    "onboarding",
    "interns",
    "offer_letter",
    "admin_documents",
    "admin_timesheets",
    "employee_documents",
    "reports",
    "admin_settings",
];

const DEFAULT_BY_ROLE: Record<string, HrPermission[]> = {
    [ROLES.HR_ADMIN]: HR_ADMIN_DEFAULT_PERMISSIONS,
    [ROLES.MANAGER]: ["directory", "interns", "reports"],
};

export function parseStoredHrPermissions(raw: string | null | undefined): HrPermission[] | null {
    if (raw == null || raw === "") return null;
    try {
        const parsed = JSON.parse(raw) as unknown;
        if (!Array.isArray(parsed)) return null;
        return parsed.filter((k): k is HrPermission =>
            HR_PERMISSIONS.includes(k as HrPermission)
        );
    } catch {
        return null;
    }
}

export function getEffectiveHrPermissions(role: Role, stored: string | null | undefined): HrPermission[] {
    if (isSuperAdminRole(role)) return [...HR_PERMISSIONS];
    const custom = parseStoredHrPermissions(stored);
    if (custom) return custom;
    return DEFAULT_BY_ROLE[role] ?? [];
}

export function hasHrPermission(
    role: Role | undefined,
    stored: string | null | undefined,
    permission: HrPermission
): boolean {
    if (!role) return false;
    if (isSuperAdminRole(role)) return true;

    const custom = parseStoredHrPermissions(stored);
    if (custom && custom.length > 0) {
        return custom.includes(permission);
    }

    if (role !== ROLES.HR_ADMIN && role !== ROLES.MANAGER) return false;
    return getEffectiveHrPermissions(role, stored).includes(permission);
}

/** HR team members who may not yet have HR_ADMIN / MANAGER role in the database. */
export function isHrProfileUser(user: {
    profile?: { department?: string | null; position?: string | null } | null;
}): boolean {
    const dept = (user.profile?.department ?? "").toLowerCase();
    const pos = (user.profile?.position ?? "").toLowerCase();
    return (
        dept.includes("hr") ||
        pos.includes("hr") ||
        pos.includes("human resources")
    );
}

/** Roles that can receive Super Admin–granted HR permissions */
export const HR_ACCESS_ROLES: Role[] = [ROLES.HR_ADMIN, ROLES.MANAGER];

export function canReceiveHrGrants(
    role: Role,
    profile?: { department?: string | null; position?: string | null } | null
): boolean {
    if (isSuperAdminRole(role)) return false;
    return HR_ACCESS_ROLES.includes(role) || isHrProfileUser({ profile });
}
