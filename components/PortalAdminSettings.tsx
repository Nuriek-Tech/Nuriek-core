"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import {
    Clock,
    Users,
    Save,
    Loader2,
    AlertCircle,
    CheckCircle2,
    MapPin,
    Shield,
} from "lucide-react";
import { isSuperAdminRole } from "@/lib/constants";
import { hasHrPermission } from "@/lib/hr-permissions";
import HrAccessPanel from "@/components/HrAccessPanel";

type WorkHoursConfig = {
    workStartHour: number;
    workStartMin: number;
    workEndHour: number;
    workEndMin: number;
    flexibleRoles: string;
    officeName?: string;
    lateGraceMinutes?: number;
};

const DEFAULT_CONFIG: WorkHoursConfig = {
    workStartHour: 9,
    workStartMin: 0,
    workEndHour: 18,
    workEndMin: 0,
    flexibleRoles: "INTERN",
    officeName: "Bangalore (HQ)",
    lateGraceMinutes: 15,
};

export default function PortalAdminSettings() {
    const { data: session } = useSession();
    const role = session?.user?.role;
    const isSuperAdmin = isSuperAdminRole(role);
    const canEditWorkHours = hasHrPermission(role, session?.user?.hrPermissions, "admin_settings");

    const [config, setConfig] = useState<WorkHoursConfig>(DEFAULT_CONFIG);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(
        null
    );

    useEffect(() => {
        if (!canEditWorkHours && !isSuperAdmin) {
            setLoading(false);
            return;
        }
        fetch("/api/admin/settings/work-hours")
            .then((res) => res.json())
            .then((data) => {
                setConfig(data);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, [canEditWorkHours, isSuperAdmin]);

    if (!canEditWorkHours && !isSuperAdmin) {
        return null;
    }

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setMessage(null);
        try {
            const res = await fetch("/api/admin/settings/work-hours", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(config),
            });
            if (res.ok) {
                setMessage({ type: "success", text: "Settings saved successfully." });
            } else {
                setMessage({ type: "error", text: "Failed to save settings." });
            }
        } catch {
            setMessage({ type: "error", text: "An error occurred while saving." });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <section className="setPanel glass setPanel--compact setAdminBlock">
                <div className="repLoading">
                    <Loader2 className="animate-spin" size={24} />
                </div>
            </section>
        );
    }

    return (
        <div id="super-admin" className="setAdminBlock">
            <div className="setAdminBlockHead">
                <p className="hubEyebrow">Super Admin</p>
                <h2 className="setAdminBlockTitle">
                    <Shield size={20} className="setAdminBlockIcon" />
                    HR & company settings
                </h2>
                <p className="setHint setAdminBlockDesc">
                    Module access for HR team, work timings, and office defaults.
                </p>
            </div>

            {isSuperAdmin && <HrAccessPanel />}

            {(canEditWorkHours || isSuperAdmin) && (
                <form onSubmit={handleSave} className={isSuperAdmin ? "setAdminFormGap" : undefined}>
                    <section className="setPanel glass setPanel--compact">
                        <div className="setPanelHeader">
                            <span className="setPanelTitle">
                                <span className="setPanelIcon">
                                    <Clock size={18} />
                                </span>
                                Work timings & punctuality
                            </span>
                        </div>

                        <div className="admFormStack">
                            <div className="setGrid2">
                                <div className="admField">
                                    <label className="admLabel">Shift start</label>
                                    <div className="setTimeRow">
                                        <input
                                            type="number"
                                            min={0}
                                            max={23}
                                            className="admInput setTimeInput"
                                            value={config.workStartHour}
                                            onChange={(e) =>
                                                setConfig({
                                                    ...config,
                                                    workStartHour: parseInt(e.target.value, 10) || 0,
                                                })
                                            }
                                        />
                                        <span>:</span>
                                        <input
                                            type="number"
                                            min={0}
                                            max={59}
                                            className="admInput setTimeInput"
                                            value={config.workStartMin}
                                            onChange={(e) =>
                                                setConfig({
                                                    ...config,
                                                    workStartMin: parseInt(e.target.value, 10) || 0,
                                                })
                                            }
                                        />
                                    </div>
                                    <p className="setHint">
                                        Check-ins after this time are marked LATE (except flexible roles).
                                    </p>
                                </div>

                                <div className="admField">
                                    <label className="admLabel">Shift end</label>
                                    <div className="setTimeRow">
                                        <input
                                            type="number"
                                            min={0}
                                            max={23}
                                            className="admInput setTimeInput"
                                            value={config.workEndHour}
                                            onChange={(e) =>
                                                setConfig({
                                                    ...config,
                                                    workEndHour: parseInt(e.target.value, 10) || 0,
                                                })
                                            }
                                        />
                                        <span>:</span>
                                        <input
                                            type="number"
                                            min={0}
                                            max={59}
                                            className="admInput setTimeInput"
                                            value={config.workEndMin}
                                            onChange={(e) =>
                                                setConfig({
                                                    ...config,
                                                    workEndMin: parseInt(e.target.value, 10) || 0,
                                                })
                                            }
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="admField">
                                <label className="admLabel">
                                    <Users size={12} style={{ display: "inline", marginRight: 4 }} />
                                    Flexible timing roles
                                </label>
                                <input
                                    type="text"
                                    className="admInput"
                                    value={config.flexibleRoles}
                                    onChange={(e) =>
                                        setConfig({ ...config, flexibleRoles: e.target.value })
                                    }
                                    placeholder="INTERN, CONTRACTOR"
                                />
                                <p className="setHint">Comma-separated roles exempt from late penalties.</p>
                            </div>

                            <div className="admField">
                                <label className="admLabel">
                                    <MapPin size={12} style={{ display: "inline", marginRight: 4 }} />
                                    Default office name
                                </label>
                                <input
                                    type="text"
                                    className="admInput"
                                    value={config.officeName ?? ""}
                                    onChange={(e) =>
                                        setConfig({ ...config, officeName: e.target.value })
                                    }
                                />
                            </div>

                            <div className="admField">
                                <label className="admLabel">Late grace (minutes)</label>
                                <input
                                    type="number"
                                    min={0}
                                    max={120}
                                    className="admInput"
                                    value={config.lateGraceMinutes ?? 15}
                                    onChange={(e) =>
                                        setConfig({
                                            ...config,
                                            lateGraceMinutes: parseInt(e.target.value, 10) || 0,
                                        })
                                    }
                                />
                                <p className="setHint">
                                    Check-ins within this window after shift start may still count as on time.
                                </p>
                            </div>
                        </div>
                    </section>

                    {message && (
                        <p
                            className={`setMsg setMsg--${message.type === "success" ? "success" : "error"}`}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "0.5rem",
                                marginTop: "0.75rem",
                            }}
                        >
                            {message.type === "success" ? (
                                <CheckCircle2 size={18} />
                            ) : (
                                <AlertCircle size={18} />
                            )}
                            {message.text}
                        </p>
                    )}

                    <div className="setSaveRow">
                        <button type="submit" className="admSubmitBtn" disabled={saving}>
                            {saving ? (
                                <Loader2 className="animate-spin" size={20} />
                            ) : (
                                <>
                                    <Save size={18} />
                                    Save company settings
                                </>
                            )}
                        </button>
                    </div>
                </form>
            )}
        </div>
    );
}
