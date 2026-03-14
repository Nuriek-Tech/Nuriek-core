export const ROLES = {
    FOUNDER: "FOUNDER",
    HR_ADMIN: "HR_ADMIN",
    MANAGER: "MANAGER",
    TEAM_LEAD: "TEAM_LEAD",
    EMPLOYEE: "EMPLOYEE",
    INTERN: "INTERN",
    CONTRACTOR: "CONTRACTOR",
} as const;

export type Role = keyof typeof ROLES;

export const SESSION_MAX_AGE = 30 * 24 * 60 * 60; // 30 days

export const NAV_ITEMS = [
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
    },
    {
        label: "Intern Management",
        path: "/interns",
        roles: [ROLES.FOUNDER, ROLES.HR_ADMIN, ROLES.MANAGER, ROLES.TEAM_LEAD],
        icon: "GraduationCap",
    },
    {
        label: "Documents & Legal",
        path: "/documents",
        roles: [ROLES.FOUNDER, ROLES.HR_ADMIN, ROLES.MANAGER, ROLES.TEAM_LEAD, ROLES.EMPLOYEE, ROLES.CONTRACTOR],
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
        roles: [ROLES.FOUNDER, ROLES.HR_ADMIN],
        icon: "FileCheck",
    },
    {
        label: "Reports",
        path: "/reports",
        roles: [ROLES.FOUNDER, ROLES.HR_ADMIN, ROLES.MANAGER],
        icon: "BarChart3",
    },
    {
        label: "Settings",
        path: "/settings",
        roles: [ROLES.FOUNDER, ROLES.HR_ADMIN],
        icon: "Settings",
    },
];

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
