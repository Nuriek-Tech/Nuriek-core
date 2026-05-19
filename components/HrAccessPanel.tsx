"use client";

import { useCallback, useEffect, useState } from "react";
import { Shield, Loader2, Save, RotateCcw, UserPlus } from "lucide-react";
import {
    HR_PERMISSIONS,
    HR_PERMISSION_LABELS,
    type HrPermission,
} from "@/lib/hr-permissions";
import { ROLES } from "@/lib/constants";
import { formatRoleLabel } from "@/lib/roles";

type HrUserRow = {
    id: string;
    name: string | null;
    email: string | null;
    role: string;
    department?: string | null;
    position?: string | null;
    isHrProfile?: boolean;
    stored: HrPermission[] | null;
    effective: HrPermission[];
};

type AddableUser = {
    id: string;
    name: string | null;
    email: string | null;
    role: string | null;
    department?: string | null;
    position?: string | null;
};

function roleLabel(u: HrUserRow) {
    if (u.isHrProfile) return "HR team (profile)";
    return formatRoleLabel(u.role);
}

export default function HrAccessPanel() {
    const [users, setUsers] = useState<HrUserRow[]>([]);
    const [addable, setAddable] = useState<AddableUser[]>([]);
    const [drafts, setDrafts] = useState<Record<string, HrPermission[]>>({});
    const [loading, setLoading] = useState(true);
    const [savingId, setSavingId] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const [pickId, setPickId] = useState("");

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/admin/hr-access");
            if (res.ok) {
                const data = await res.json();
                const list: HrUserRow[] = data.users ?? [];
                setUsers(list);
                setAddable(data.addable ?? []);
                const next: Record<string, HrPermission[]> = {};
                for (const u of list) {
                    next[u.id] = [...u.effective];
                }
                setDrafts(next);
            } else {
                const data = await res.json().catch(() => ({}));
                setMessage((data as { error?: string }).error || "Failed to load HR access.");
            }
        } catch {
            setMessage("Failed to load HR access settings.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const toggle = (userId: string, key: HrPermission) => {
        setDrafts((prev) => {
            const current = prev[userId] ?? [];
            const has = current.includes(key);
            return {
                ...prev,
                [userId]: has ? current.filter((k) => k !== key) : [...current, key],
            };
        });
    };

    const resetToRoleDefaults = async (userId: string) => {
        setSavingId(userId);
        try {
            const res = await fetch("/api/admin/hr-access", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId, permissions: [] }),
            });
            if (res.ok) {
                setMessage("Reset to role defaults. User should sign out and back in to refresh menu.");
                await load();
            } else {
                const data = await res.json().catch(() => ({}));
                setMessage((data as { error?: string }).error || "Reset failed");
            }
        } finally {
            setSavingId(null);
        }
    };

    const save = async (userId: string, promoteToHrAdmin = false) => {
        setSavingId(userId);
        setMessage(null);
        try {
            const res = await fetch("/api/admin/hr-access", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    userId,
                    permissions: drafts[userId] ?? [],
                    promoteToHrAdmin,
                }),
            });
            const data = await res.json().catch(() => ({}));
            if (res.ok) {
                setMessage("Access saved. Ask them to sign out and back in to update the sidebar.");
                await load();
            } else {
                setMessage((data as { error?: string }).error || "Save failed");
            }
        } finally {
            setSavingId(null);
        }
    };

    const addStaffMember = async () => {
        if (!pickId) return;
        const picked = addable.find((u) => u.id === pickId);
        setSavingId(pickId);
        setMessage(null);
        try {
            const res = await fetch("/api/admin/hr-access", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    userId: pickId,
                    permissions: [...HR_PERMISSIONS.filter((p) => p !== "admin_settings")],
                    promoteToHrAdmin: true,
                }),
            });
            const data = await res.json().catch(() => ({}));
            if (res.ok) {
                setMessage(
                    `${picked?.name || picked?.email || "User"} added as HR Admin with default access.`
                );
                setPickId("");
                await load();
            } else {
                setMessage((data as { error?: string }).error || "Could not add staff member");
            }
        } finally {
            setSavingId(null);
        }
    };

    if (loading) {
        return (
            <div className="setPanel glass" style={{ display: "flex", justifyContent: "center", padding: "2rem" }}>
                <Loader2 className="animate-spin" size={28} />
            </div>
        );
    }

    return (
        <section className="setPanel glass hrAccessPanel">
            <div className="setPanelHeader">
                <span className="setPanelTitle">
                    <span className="setPanelIcon">
                        <Shield size={18} />
                    </span>
                    HR & manager access
                </span>
            </div>
            <p className="setHint" style={{ marginTop: 0 }}>
                Choose which modules each HR Admin, Manager, or HR team member can use. Super Admins always
                have full access. Staff in an HR department or with &quot;HR&quot; in their job title appear
                automatically (e.g. Rekha).
            </p>

            {addable.length > 0 && (
                <div className="hrAccessAddRow">
                    <select
                        className="admSelect"
                        value={pickId}
                        onChange={(e) => setPickId(e.target.value)}
                    >
                        <option value="">Add HR staff from directory…</option>
                        {addable.map((u) => (
                            <option key={u.id} value={u.id}>
                                {u.name || u.email} ({formatRoleLabel(u.role)})
                                {u.department ? ` · ${u.department}` : ""}
                            </option>
                        ))}
                    </select>
                    <button
                        type="button"
                        className="admSubmitBtn"
                        disabled={!pickId || savingId === pickId}
                        onClick={addStaffMember}
                    >
                        <UserPlus size={16} />
                        Add &amp; grant HR access
                    </button>
                </div>
            )}

            {message && <p className="setMsg setMsg--success">{message}</p>}

            {users.length === 0 ? (
                <p className="setHint">
                    No HR staff found yet. Use the dropdown above to add someone (e.g. rekha@nuriek.com),
                    or set their role to HR Admin in Employee Directory → onboard/edit.
                </p>
            ) : (
                <div className="hrAccessList">
                    {users.map((u) => (
                        <article key={u.id} className="hrAccessCard">
                            <header className="hrAccessCardHead">
                                <div>
                                    <strong>{u.name || u.email}</strong>
                                    <span className="hrAccessRole">{roleLabel(u)}</span>
                                    {(u.position || u.department) && (
                                        <span className="hrAccessRole">
                                            {[u.position, u.department].filter(Boolean).join(" · ")}
                                        </span>
                                    )}
                                </div>
                                <div className="hrAccessCardActions">
                                    <button
                                        type="button"
                                        className="olBtnSecondary"
                                        title="Clear custom grants (use role defaults)"
                                        disabled={savingId === u.id}
                                        onClick={() => resetToRoleDefaults(u.id)}
                                    >
                                        <RotateCcw size={14} />
                                        Defaults
                                    </button>
                                    {u.role === ROLES.EMPLOYEE && u.isHrProfile && (
                                        <button
                                            type="button"
                                            className="olBtnSecondary"
                                            disabled={savingId === u.id}
                                            onClick={() => save(u.id, true)}
                                            title="Set role to HR Admin"
                                        >
                                            Make HR Admin
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        className="admSubmitBtn"
                                        style={{ padding: "0.4rem 0.85rem", fontSize: "0.85rem" }}
                                        disabled={savingId === u.id}
                                        onClick={() => save(u.id)}
                                    >
                                        {savingId === u.id ? (
                                            <Loader2 className="animate-spin" size={14} />
                                        ) : (
                                            <Save size={14} />
                                        )}
                                        Save
                                    </button>
                                </div>
                            </header>
                            <div className="hrAccessGrid">
                                {HR_PERMISSIONS.map((key) => (
                                    <label key={key} className="hrAccessCheck">
                                        <input
                                            type="checkbox"
                                            checked={(drafts[u.id] ?? []).includes(key)}
                                            onChange={() => toggle(u.id, key)}
                                        />
                                        <span>{HR_PERMISSION_LABELS[key]}</span>
                                    </label>
                                ))}
                            </div>
                            {u.stored && (
                                <p className="setHint" style={{ marginBottom: 0 }}>
                                    Custom access active (overrides role defaults).
                                </p>
                            )}
                        </article>
                    ))}
                </div>
            )}
        </section>
    );
}
