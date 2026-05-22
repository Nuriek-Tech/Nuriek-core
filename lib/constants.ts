import type { HrPermission } from "@/lib/hr-permissions";

export const ROLES = {
    FOUNDER: "FOUNDER",
    HR_ADMIN: "HR_ADMIN",
    MANAGER: "MANAGER",
    TEAM_LEAD: "TEAM_LEAD",
    EMPLOYEE: "EMPLOYEE",
    INTERN: "INTERN",
    CONTRACTOR: "CONTRACTOR",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const ADMIN_ROLES: Role[] = [ROLES.FOUNDER, ROLES.HR_ADMIN];

export function isAdminRole(role?: Role): boolean {
    return role === ROLES.FOUNDER || role === ROLES.HR_ADMIN;
}

/** Full-access Super Admin (stored as FOUNDER in the database). */
export function isSuperAdminRole(role?: Role): boolean {
    return role === ROLES.FOUNDER;
}

/** Super Admin does not get inactivity auto-logout. */
export function hasInactivityAutoLogout(role?: Role): boolean {
    return !isSuperAdminRole(role);
}

/** Auto sign-out after this idle period (employees & HR; not Super Admin). */
export const SESSION_INACTIVITY_MS = 15 * 60 * 1000;

export const DIRECTORY_HIDDEN_ROLES: Role[] = [ROLES.FOUNDER, ROLES.HR_ADMIN];

export function isDirectoryHiddenRole(role?: string | null): boolean {
    return role === ROLES.FOUNDER || role === ROLES.HR_ADMIN;
}

/** Employee directory listing — excludes Super Admin & HR Admin for non-HR viewers. */
export function filterDirectoryEmployees<T extends { role: string }>(
    employees: T[],
    viewerRole?: Role
): T[] {
    const viewerSeesAdmins =
        viewerRole === ROLES.FOUNDER || viewerRole === ROLES.HR_ADMIN;
    if (viewerSeesAdmins) return employees;
    return employees.filter((e) => !isDirectoryHiddenRole(e.role));
}

export function isReportRole(role?: Role): boolean {
    return role === ROLES.FOUNDER || role === ROLES.HR_ADMIN || role === ROLES.MANAGER;
}

/** Contact HR is for individual contributors only — not admin or HR staff. */
export const CONTACT_HR_ROLES: Role[] = [ROLES.EMPLOYEE, ROLES.INTERN];

export function canAccessContactHr(role?: Role): boolean {
    return role === ROLES.EMPLOYEE || role === ROLES.INTERN;
}

export const DIRECTORY_ROLES: Role[] = [
    ROLES.FOUNDER,
    ROLES.HR_ADMIN,
    ROLES.MANAGER,
];

export const REPORT_ROLES: Role[] = [
    ROLES.FOUNDER,
    ROLES.HR_ADMIN,
    ROLES.MANAGER,
];

export const SESSION_MAX_AGE = 30 * 24 * 60 * 60;

export type NavItem = {
    label: string;
    path: string;
    roles: Role[];
    icon: string;
    /** When set, HR Admin / Manager need this grant (Super Admin always has access). */
    hrPermission?: HrPermission;
};

export const NAV_ITEMS: NavItem[] = [
    {
        label: "Dashboard",
        path: "/dashboard",
        roles: [ROLES.FOUNDER, ROLES.HR_ADMIN, ROLES.MANAGER, ROLES.TEAM_LEAD, ROLES.EMPLOYEE, ROLES.INTERN, ROLES.CONTRACTOR],
        icon: "LayoutDashboard",
    },
    {
        label: "Time Management",
        path: "/attendance",
        roles: [ROLES.MANAGER, ROLES.TEAM_LEAD, ROLES.EMPLOYEE, ROLES.INTERN, ROLES.CONTRACTOR],
        icon: "Clock",
    },
    {
        label: "Employee Directory",
        path: "/directory",
        roles: [ROLES.FOUNDER, ROLES.HR_ADMIN, ROLES.MANAGER],
        icon: "Users",
        hrPermission: "directory",
    },
    {
        label: "Intern Management",
        path: "/interns",
        roles: [ROLES.FOUNDER, ROLES.HR_ADMIN, ROLES.MANAGER, ROLES.TEAM_LEAD, ROLES.INTERN],
        icon: "GraduationCap",
        hrPermission: "interns",
    },
    {
        label: "Documents & Legal",
        path: "/documents",
        roles: [ROLES.FOUNDER, ROLES.HR_ADMIN, ROLES.MANAGER, ROLES.TEAM_LEAD, ROLES.EMPLOYEE, ROLES.INTERN, ROLES.CONTRACTOR],
        icon: "FileText",
    },
    {
        label: "Leave & Holidays",
        path: "/leave",
        roles: [ROLES.FOUNDER, ROLES.HR_ADMIN, ROLES.MANAGER, ROLES.TEAM_LEAD, ROLES.EMPLOYEE, ROLES.INTERN, ROLES.CONTRACTOR],
        icon: "Calendar",
    },
    {
        label: "Company Drive",
        path: "/drive",
        roles: [ROLES.FOUNDER, ROLES.HR_ADMIN, ROLES.MANAGER, ROLES.TEAM_LEAD, ROLES.EMPLOYEE, ROLES.INTERN, ROLES.CONTRACTOR],
        icon: "Folder",
    },
    {
        label: "Admin Timesheets",
        path: "/admin/timesheets",
        roles: [ROLES.FOUNDER, ROLES.HR_ADMIN, ROLES.MANAGER],
        icon: "FileCheck",
        hrPermission: "admin_timesheets",
    },
    {
        label: "Admin Documents",
        path: "/admin/documents",
        roles: [ROLES.FOUNDER, ROLES.HR_ADMIN, ROLES.MANAGER],
        icon: "FileUp",
        hrPermission: "admin_documents",
    },
    {
        label: "Offer Letter",
        path: "/admin/offer-letter",
        roles: [ROLES.FOUNDER, ROLES.HR_ADMIN, ROLES.MANAGER],
        icon: "FileSignature",
        hrPermission: "offer_letter",
    },
    {
        label: "Reports",
        path: "/reports",
        roles: [ROLES.FOUNDER, ROLES.HR_ADMIN, ROLES.MANAGER],
        icon: "BarChart3",
        hrPermission: "reports",
    },
    {
        label: "Login activity",
        path: "/admin/login-sessions",
        roles: [ROLES.FOUNDER, ROLES.HR_ADMIN],
        icon: "LogIn",
    },
    {
        label: "Holiday calendar",
        path: "/admin/holidays",
        roles: [ROLES.FOUNDER],
        icon: "Calendar",
    },
    {
        label: "Contact HR",
        path: "/contact-hr",
        roles: CONTACT_HR_ROLES,
        icon: "Mail",
    },
    {
        label: "My Certificates",
        path: "/certificates",
        roles: [ROLES.FOUNDER, ROLES.HR_ADMIN, ROLES.MANAGER, ROLES.TEAM_LEAD, ROLES.EMPLOYEE, ROLES.INTERN, ROLES.CONTRACTOR],
        icon: "BadgeCheck",
    },
    {
        label: "Settings",
        path: "/settings",
        roles: [ROLES.FOUNDER, ROLES.HR_ADMIN, ROLES.MANAGER, ROLES.TEAM_LEAD, ROLES.EMPLOYEE, ROLES.INTERN, ROLES.CONTRACTOR],
        icon: "Settings",
    },
];

export const DRIVE_CATEGORIES = [
    "General",
    "Resources",
    "Templates",
    "Brand Assets",
    "Product Specs",
    "Policies",
] as const;

export const PREDEFINED_TASKS = [
    "Project Development & Coding",
    "Bug Fixing & Debugging",
    "Internal Team Meeting",
    "Client Communication / Support",
    "Documentation & Reporting",
    "Code Review & Peer Feedback",
    "Learning & Skill Development",
    "General Administrative Tasks",
    "Research & Development",
    "Infrastructure & DevOps",
];
