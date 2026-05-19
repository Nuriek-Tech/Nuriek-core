"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useSidebar } from "@/components/Providers";
import { NavIcon } from "@/lib/nav-icons";
import { ADMIN_ROLES, ROLES } from "@/lib/constants";
import { formatRoleLabel } from "@/lib/roles";
import { filterNavItemsForUser } from "@/lib/nav-filter";
import { useNavRole } from "@/hooks/useNavRole";
import "./sidebar.css";

export default function Sidebar() {
    const pathname = usePathname();
    const { data: session } = useSession();
    const { isOpen, setIsOpen } = useSidebar();
    const { role: userRole, hrPermissions, isReady } = useNavRole();

    const filteredNavItems = filterNavItemsForUser(userRole, hrPermissions);

    return (
        <nav className={`sidebar glass ${isOpen ? "sidebarOpen" : ""}`}>
            <div className="logoSection">
                <span className="logoText">NURIEK CORE</span>
            </div>

            <div className={`navSection ${!isReady ? "navSection--settling" : ""}`}>
                {filteredNavItems.map((item) => {
                    const isActive = pathname.startsWith(item.path);
                    let label = item.label;

                    if (item.path === "/drive" && !ADMIN_ROLES.includes(userRole)) {
                        label = "Employee Handbook";
                    }
                    if (item.path === "/interns" && userRole === ROLES.INTERN) {
                        label = "My Performance";
                    }

                    return (
                        <Link
                            key={item.path}
                            href={item.path}
                            prefetch
                            className={`navItem ${isActive ? "navItemActive" : ""}`}
                            onClick={() => setIsOpen(false)}
                        >
                            <NavIcon name={item.icon} className="icon" />
                            <span>{label}</span>
                        </Link>
                    );
                })}
            </div>

            <div className="userSection">
                <div className="userInfo">
                    <div className="avatar">
                        {session?.user?.name?.charAt(0) || "U"}
                    </div>
                    <div className="userDetails">
                        <span className="userName">{session?.user?.name ?? "…"}</span>
                        <span className="userRole">{formatRoleLabel(userRole)}</span>
                    </div>
                </div>

                <button onClick={() => signOut()} className="logoutButton">
                    <NavIcon name="LogOut" />
                    <span>Logout</span>
                </button>
            </div>
        </nav>
    );
}
