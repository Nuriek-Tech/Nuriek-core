"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { signOut, useSession } from "next-auth/react";
import * as Icons from "lucide-react";
import { useSidebar } from "@/components/Providers";
import { NAV_ITEMS, ROLES } from "@/lib/constants";
import "./sidebar.css";

const IconHelper = ({ name, className }: { name: string; className?: string }) => {
    const Icon = (Icons as any)[name];
    return Icon ? <Icon className={className} size={20} /> : null;
};

export default function Sidebar() {
    const pathname = usePathname();
    const { data: session } = useSession();
    const { isOpen, setIsOpen } = useSidebar();
    const userRole = (session?.user as any)?.role || ROLES.EMPLOYEE;

    const filteredNavItems = NAV_ITEMS.filter((item) =>
        item.roles.includes(userRole)
    );

    return (
        <nav className={`sidebar glass ${isOpen ? "sidebarOpen" : ""}`}>
            <div className="logoSection">
                <Image
                    src="/logo.png"
                    alt="Nuriek Logo"
                    width={32}
                    height={32}
                    className="logoImage"
                />
                <span className="logoText text-gradient">Nuriek Core</span>
            </div>

            <div className="navSection">
                {filteredNavItems.map((item) => {
                    const isActive = pathname.startsWith(item.path);
                    let label = item.label;

                    // Rename "Company Drive" to "Employee Handbook" for non-admins
                    if (item.path === "/drive" && ![ROLES.FOUNDER, ROLES.HR_ADMIN].includes(userRole)) {
                        label = "Employee Handbook";
                    }
                    // Rename "Intern Management" to "My Performance" for interns
                    if (item.path === "/interns" && userRole === ROLES.INTERN) {
                        label = "My Performance";
                    }

                    return (
                        <Link
                            key={item.path}
                            href={item.path}
                            className={`navItem ${isActive ? "navItemActive" : ""}`}
                            onClick={() => setIsOpen(false)}
                        >
                            <IconHelper name={item.icon} className="icon" />
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
                        <span className="userName">{session?.user?.name}</span>
                        <span className="userRole">{userRole.replace("_", " ").toLowerCase()}</span>
                    </div>
                </div>

                <button onClick={() => signOut()} className="logoutButton">
                    <IconHelper name="LogOut" />
                    <span>Logout</span>
                </button>
            </div>
        </nav>
    );
}
