"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Search, UserPlus, Users } from "lucide-react";
import { formatRoleLabel } from "@/lib/roles";
import { reportingManagerDisplayName } from "@/lib/reporting-manager";
import "@/styles/directory.css";

export type DirectoryEmployee = {
    id: string;
    name: string | null;
    email: string | null;
    role: string;
    isActive: boolean;
    onboardingStatus: string;
    createdAt: string;
    updatedAt: string;
    reportsTo?: { id: string; name: string | null; email: string | null } | null;
    profile?: { position?: string | null; department?: string | null; joinDate?: string | null } | null;
};

function statusOf(employee: DirectoryEmployee) {
    if (!employee.isActive) return "Exited";
    if (employee.onboardingStatus === "IN_PROGRESS") return "Onboarding";
    return "Active";
}

function dateLabel(value: string | null | undefined) {
    if (!value) return "—";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "—" : new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata" }).format(date);
}
function timeLabel(value: string) {
    return new Intl.DateTimeFormat("en-IN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" }).format(new Date(value));
}

export default function DirectoryClient({ employees, canOnboard }: {
    employees: DirectoryEmployee[];
    canOnboard: boolean;
    isSuperAdmin: boolean;
}) {
    const [search, setSearch] = useState("");
    const [status, setStatus] = useState("All");
    const [department, setDepartment] = useState("All departments");
    const departments = useMemo(() => ["All departments", ...new Set(employees.map(e => e.profile?.department).filter((value): value is string => Boolean(value)))].sort((a, b) => a === "All departments" ? -1 : b === "All departments" ? 1 : a.localeCompare(b)), [employees]);
    const filtered = useMemo(() => employees.filter(employee => {
        if (status !== "All" && statusOf(employee) !== status) return false;
        if (department !== "All departments" && employee.profile?.department !== department) return false;
        const haystack = [employee.name, employee.email, employee.role, employee.profile?.position, employee.profile?.department, employee.reportsTo?.name].filter(Boolean).join(" ").toLowerCase();
        return haystack.includes(search.trim().toLowerCase());
    }), [employees, search, status, department]);
    const counts = { Active: 0, Onboarding: 0, Exited: 0 };
    employees.forEach(employee => counts[statusOf(employee) as keyof typeof counts]++);

    return <main className="peopleWorkspace">
        <header className="peopleHeader">
            <div><p className="peopleEyebrow">People operations / Workforce</p><h1>Employee directory</h1><p>One place to manage every employee from joining through exit.</p></div>
            {canOnboard && <Link href="/directory/onboard" className="peoplePrimary"><UserPlus size={17} /> Add employee</Link>}
        </header>
        <section className="peopleSummary" aria-label="Workforce summary">
            <div><span>Total employees</span><strong>{employees.length}</strong><small>All workforce records</small></div>
            <div><span>Active</span><strong>{counts.Active}</strong><small>Currently employed</small></div>
            <div><span>Onboarding</span><strong>{counts.Onboarding}</strong><small>Joining in progress</small></div>
            <div><span>Exited</span><strong>{counts.Exited}</strong><small>Records retained</small></div>
        </section>
        <section className="peoplePanel">
            <div className="peoplePanelHeader"><div><h2>Workforce records</h2><p>{filtered.length} of {employees.length} employees</p></div></div>
            <div className="peopleToolbar">
                <label className="peopleSearch"><Search size={17}/><input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search name, role, team or manager" aria-label="Search employees" /></label>
                <select value={status} onChange={event => setStatus(event.target.value)} aria-label="Filter by employment status"><option>All</option><option>Active</option><option>Onboarding</option><option>Exited</option></select>
                <select value={department} onChange={event => setDepartment(event.target.value)} aria-label="Filter by department">{departments.map(item => <option key={item}>{item}</option>)}</select>
            </div>
            {filtered.length ? <div className="peopleTableScroll"><table className="peopleTable"><thead><tr><th>Employee</th><th>Role &amp; team</th><th>Reports to</th><th>Joined</th><th>Record updated</th><th>Status</th><th><span className="sr-only">Open</span></th></tr></thead><tbody>{filtered.map(employee => <tr key={employee.id}>
                <td><Link className="peopleIdentity" href={`/profile/${employee.id}`}><span className="peopleAvatar">{(employee.name || "U").charAt(0).toUpperCase()}</span><span><strong>{employee.name || "Unnamed employee"}</strong><small>{employee.email || "No work email"}</small></span></Link></td>
                <td><strong>{employee.profile?.position || formatRoleLabel(employee.role)}</strong><small>{employee.profile?.department || "Unassigned department"}</small></td>
                <td>{employee.reportsTo ? reportingManagerDisplayName(employee.reportsTo) : "—"}</td>
                <td><time dateTime={employee.profile?.joinDate || employee.createdAt}>{dateLabel(employee.profile?.joinDate || employee.createdAt)}</time></td>
                <td><time dateTime={employee.updatedAt}>{dateLabel(employee.updatedAt)}<small>{timeLabel(employee.updatedAt)} IST</small></time></td>
                <td><span className={`peopleStatus peopleStatus--${statusOf(employee).toLowerCase()}`}>{statusOf(employee)}</span></td>
                <td><Link className="peopleOpen" href={`/profile/${employee.id}`} aria-label={`Open ${employee.name || "employee"} profile`}><ArrowUpRight size={17}/></Link></td>
            </tr>)}</tbody></table></div> : <div className="peopleEmpty"><Users size={28}/><strong>No employees found</strong><p>Try a different search or filter.</p><button type="button" onClick={() => {setSearch(""); setStatus("All"); setDepartment("All departments");}}>Clear filters</button></div>}
        </section>
    </main>;
}
