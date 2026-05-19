import { ROLES, type Role } from "@/lib/constants";
import { formatRoleLabel } from "@/lib/roles";

/** Roles that may be assigned as someone's reporting manager. */
export const REPORTING_MANAGER_ROLES: Role[] = [
    ROLES.FOUNDER,
    ROLES.HR_ADMIN,
    ROLES.MANAGER,
    ROLES.TEAM_LEAD,
];

export type ReportingManagerOption = {
    id: string;
    name: string;
    email: string | null;
    role: string;
    label: string;
};

export function formatReportingManagerLabel(user: {
    name: string | null;
    email?: string | null;
    role?: string | null;
}): string {
    const name = user.name?.trim() || user.email || "Unknown";
    const role = user.role ? formatRoleLabel(user.role) : "";
    return role ? `${name} (${role})` : name;
}

export function reportingManagerDisplayName(
    manager: { name: string | null; email?: string | null } | null | undefined
): string {
    if (!manager) return "";
    return manager.name?.trim() || manager.email || "";
}
