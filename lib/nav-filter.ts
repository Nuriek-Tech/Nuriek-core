import { NAV_ITEMS, ROLES, type NavItem, type Role, isSuperAdminRole } from "@/lib/constants";
import { hasHrPermission } from "@/lib/hr-permissions";

export function filterNavItemsForUser(
    role: Role,
    hrPermissions: string | null | undefined
): NavItem[] {
    return NAV_ITEMS.filter((item) => canSeeNavItem(role, hrPermissions, item));
}

export function canSeeNavItem(
    role: Role,
    hrPermissions: string | null | undefined,
    item: NavItem
): boolean {
    if (isSuperAdminRole(role)) {
        return item.roles.includes(ROLES.FOUNDER);
    }

    const roleListed = item.roles.includes(role);

    if (!item.hrPermission) {
        return roleListed;
    }

    if (!hasHrPermission(role, hrPermissions, item.hrPermission)) {
        return false;
    }

    return roleListed;
}
