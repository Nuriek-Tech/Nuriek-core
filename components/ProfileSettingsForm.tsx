"use client";

import { useEffect, useState } from "react";
import { Loader2, User, Save } from "lucide-react";

export default function ProfileSettingsForm() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(
        null
    );
    const [readOnly, setReadOnly] = useState({ position: "", department: "" });
    const [form, setForm] = useState({
        phoneNumber: "",
        bio: "",
        address: "",
    });

    useEffect(() => {
        fetch("/api/profile")
            .then((r) => (r.ok ? r.json() : null))
            .then((user) => {
                if (user?.profile) {
                    setForm({
                        phoneNumber: user.profile.phoneNumber || "",
                        bio: user.profile.bio || "",
                        address: user.profile.address || "",
                    });
                    setReadOnly({
                        position: user.profile.position || "—",
                        department: user.profile.department || "—",
                    });
                }
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, []);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setMessage(null);
        try {
            const res = await fetch("/api/profile", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form),
            });
            if (res.ok) {
                setMessage({ type: "success", text: "Profile updated." });
            } else {
                const d = await res.json().catch(() => ({}));
                setMessage({ type: "error", text: d.error || "Update failed." });
            }
        } catch {
            setMessage({ type: "error", text: "Network error." });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <section className="setPanel glass setPanel--compact">
                <div className="repLoading">
                    <Loader2 className="animate-spin" size={24} />
                </div>
            </section>
        );
    }

    return (
        <section className="setPanel glass setPanel--compact">
            <div className="setPanelHeader">
                <span className="setPanelTitle">
                    <span className="setPanelIcon">
                        <User size={18} />
                    </span>
                    Profile details
                </span>
            </div>

            <form onSubmit={handleSave} className="setForm setForm--wide">
                <div className="setGrid2 setGrid2--tight">
                    <div className="admField">
                        <label className="admLabel">Position</label>
                        <input className="admInput" value={readOnly.position} disabled />
                    </div>
                    <div className="admField">
                        <label className="admLabel">Department</label>
                        <input className="admInput" value={readOnly.department} disabled />
                    </div>
                </div>
                <p className="setHint setHint--inline">
                    Position and department are managed by HR.
                </p>

                <div className="setGrid2 setGrid2--tight">
                    <div className="admField">
                        <label className="admLabel" htmlFor="profile-phone">
                            Phone number
                        </label>
                        <input
                            id="profile-phone"
                            className="admInput"
                            value={form.phoneNumber}
                            onChange={(e) => setForm((f) => ({ ...f, phoneNumber: e.target.value }))}
                            placeholder="+91 …"
                        />
                    </div>
                    <div className="admField">
                        <label className="admLabel" htmlFor="profile-address">
                            Address
                        </label>
                        <input
                            id="profile-address"
                            className="admInput"
                            value={form.address}
                            onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                        />
                    </div>
                </div>

                <div className="admField">
                    <label className="admLabel" htmlFor="profile-bio">
                        Short bio
                    </label>
                    <textarea
                        id="profile-bio"
                        className="admTextarea"
                        rows={2}
                        value={form.bio}
                        onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
                        placeholder="Optional note for your profile…"
                    />
                </div>

                {message && (
                    <p className={`setMsg setMsg--${message.type === "success" ? "success" : "error"}`}>
                        {message.text}
                    </p>
                )}

                <button
                    type="submit"
                    className="admSubmitBtn"
                    disabled={saving}
                    style={{ alignSelf: "flex-start" }}
                >
                    {saving ? (
                        <Loader2 className="animate-spin" size={18} />
                    ) : (
                        <>
                            <Save size={16} />
                            Save profile
                        </>
                    )}
                </button>
            </form>
        </section>
    );
}
