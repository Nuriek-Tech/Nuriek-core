"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
    ChevronRight,
    UserPlus,
    Search,
    Users,
    Building2,
    Mail,
    Briefcase,
} from "lucide-react";
import DeleteUserButton from "./DeleteUserButton";
import { formatRoleLabel } from "@/lib/roles";
import { reportingManagerDisplayName } from "@/lib/reporting-manager";
import "@/styles/people-hub.css";
import "@/styles/directory.css";

export type DirectoryEmployee = {
    id: string;
    name: string | null;
    email: string | null;
    role: string;
    reportsTo?: { id: string; name: string | null; email: string | null } | null;
    profile?: {
        position?: string | null;
        department?: string | null;
    } | null;
};

function roleBadgeClass(role: string): string {
    const key = role.toLowerCase();
    if (key === "founder" || key === "super_admin" || key === "hr_admin") return "hubRoleBadge--super-admin";
    if (key === "manager" || key === "team_lead") return "hubRoleBadge--manager";
    if (key === "employee") return "hubRoleBadge--employee";
    if (key === "intern") return "hubRoleBadge--intern";
    return "hubRoleBadge--contractor";
}

export default function DirectoryClient({
    employees,
    canOnboard,
    isSuperAdmin,
}: {
    employees: DirectoryEmployee[];
    canOnboard: boolean;
    isSuperAdmin: boolean;
}) {
    const [search, setSearch] = useState("");
    const [roleFilter, setRoleFilter] = useState("ALL");

    const roles = useMemo(() => {
        const set = new Set(employees.map((e) => e.role));
        return ["ALL", ...Array.from(set).sort()];
    }, [employees]);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return employees.filter((e) => {
            if (roleFilter !== "ALL" && e.role !== roleFilter) return false;
            if (!q) return true;
            const hay = [
                e.name,
                e.email,
                e.role,
                e.profile?.department,
                e.profile?.position,
            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();
            return hay.includes(q);
        });
    }, [employees, search, roleFilter]);

    const deptCount = useMemo(() => {
        const depts = new Set(
            employees.map((e) => e.profile?.department).filter(Boolean)
        );
        return depts.size;
    }, [employees]);

    const internCount = employees.filter((e) => e.role === "INTERN").length;

    return (
        <div className="hubPage">
            <header className="hubHero">
                <div className="hubHeroMain">
                    <p className="hubEyebrow">People</p>
                    <h1>
                        Employee <span className="text-gradient">Directory</span>
                    </h1>
                    <p className="hubSubtitle">
                        Browse the Nuriek team, view profiles, and manage onboarding.
                    </p>
                </div>
                <div className="hubHeroActions">
                    <span className="hubStatChip">
                        <Users size={16} color="var(--nuriek-blue)" />
                        <strong>{employees.length}</strong> people
                    </span>
                    {canOnboard && (
                        <Link href="/directory/onboard" className="hubBtnPrimary">
                            <UserPlus size={18} />
                            Onboard employee
                        </Link>
                    )}
                </div>
            </header>

            <section className="hubKpiGrid" aria-label="Directory summary">
                <article className="hubKpiCard glass">
                    <span className="hubKpiLabel">Total team</span>
                    <span className="hubKpiValue hubKpiValue--default">{employees.length}</span>
                </article>
                <article className="hubKpiCard glass">
                    <span className="hubKpiLabel">Departments</span>
                    <span className="hubKpiValue hubKpiValue--blue">{deptCount || "—"}</span>
                </article>
                <article className="hubKpiCard glass">
                    <span className="hubKpiLabel">Interns</span>
                    <span className="hubKpiValue hubKpiValue--orange">{internCount}</span>
                </article>
                <article className="hubKpiCard glass">
                    <span className="hubKpiLabel">Showing</span>
                    <span className="hubKpiValue hubKpiValue--green">{filtered.length}</span>
                </article>
            </section>

            <div className="hubToolbar">
                <div className="hubSearchWrap">
                    <Search size={18} />
                    <input
                        type="search"
                        className="hubSearchInput"
                        placeholder="Search by name, email, role, department…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        aria-label="Search employees"
                    />
                </div>
                <div className="hubFilters" role="group" aria-label="Filter by role">
                    {roles.map((role) => (
                        <button
                            key={role}
                            type="button"
                            className={`hubFilterPill ${roleFilter === role ? "hubFilterPill--active" : ""}`}
                            onClick={() => setRoleFilter(role)}
                        >
                            {role === "ALL" ? "All roles" : formatRoleLabel(role)}
                        </button>
                    ))}
                </div>
                <span className="hubResultCount">
                    {filtered.length} of {employees.length}
                </span>
            </div>

            {filtered.length === 0 ? (
                <div className="dirEmptyState glass">
                    <Users size={48} className="hubEmptyIcon" />
                    <p>No employees match your search.</p>
                    <button
                        type="button"
                        className="hubFilterPill hubFilterPill--active"
                        style={{ marginTop: "1rem" }}
                        onClick={() => {
                            setSearch("");
                            setRoleFilter("ALL");
                        }}
                    >
                        Clear filters
                    </button>
                </div>
            ) : (
                <div className="dirGrid">
                    {filtered.map((employee) => (
                        <article key={employee.id} className="dirCard glass glass-hover">
                            <div className="dirCardTop">
                                <div
                                    className="dirAvatar"
                                    aria-hidden
                                    data-initial={(employee.name?.charAt(0) || "U").toUpperCase()}
                                >
                                    {employee.name?.charAt(0) || "U"}
                                </div>
                                <span className={`hubRoleBadge ${roleBadgeClass(employee.role)}`}>
                                    {formatRoleLabel(employee.role)}
                                </span>
                            </div>

                            <div className="dirCardBody">
                                <h2 className="dirName">{employee.name || "Unnamed"}</h2>
                                {employee.profile?.position && (
                                    <p className="dirMeta">
                                        <Briefcase size={14} />
                                        {employee.profile.position}
                                    </p>
                                )}
                                {employee.profile?.department && (
                                    <p className="dirMeta">
                                        <Building2 size={14} />
                                        {employee.profile.department}
                                    </p>
                                )}
                                {employee.email && (
                                    <p className="dirMeta dirMeta--email">
                                        <Mail size={14} />
                                        {employee.email}
                                    </p>
                                )}
                                {employee.reportsTo && (
                                    <p className="dirMeta">
                                        Reports to {reportingManagerDisplayName(employee.reportsTo)}
                                    </p>
                                )}
                            </div>

                            <footer className="dirCardFooter">
                                <Link href={`/profile/${employee.id}`} className="dirViewBtn">
                                    View profile
                                    <ChevronRight size={16} />
                                </Link>
                                {isSuperAdmin && <DeleteUserButton userId={employee.id} />}
                            </footer>
                        </article>
                    ))}
                </div>
            )}
        </div>
    );
}
