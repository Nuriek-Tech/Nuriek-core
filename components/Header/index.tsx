"use client";

import { useSession } from "next-auth/react";
import { Search, Bell, HelpCircle, Activity, Menu } from "lucide-react";
import { useSidebar } from "@/components/Providers";
import "./header.css";

export default function Header() {
    const { data: session } = useSession();
    const { toggle } = useSidebar();

    return (
        <header className="header glass">
            <button className="mobileMenuButton" onClick={toggle}>
                <Menu size={24} />
            </button>
            <div className="searchWrapper">
                <Search className="searchIcon" size={18} />
                <input
                    type="text"
                    className="searchInput"
                    placeholder="Search for employees, tasks, or documents..."
                />
            </div>

            <div className="actions">
                <div className="quickActions">
                    <button className="actionButton">
                        <HelpCircle size={20} />
                    </button>
                    <button className="actionButton">
                        <Bell size={20} />
                        <span className="badge"></span>
                    </button>
                </div>

                <button className="checkInButton">
                    <Activity size={18} />
                    <span>Quick Check-in</span>
                </button>
            </div>
        </header>
    );
}
