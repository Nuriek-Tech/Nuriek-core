"use client";

import { useState, useEffect } from "react";
import { Clock, Users, Save, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import "@/styles/dashboard.css";

export default function AdminSettingsPage() {
    const [config, setConfig] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

    useEffect(() => {
        fetch("/api/admin/settings/work-hours")
            .then(res => res.json())
            .then(data => {
                setConfig(data);
                setLoading(false);
            })
            .catch(err => {
                console.error("Failed to fetch settings", err);
                setLoading(false);
            });
    }, []);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setMessage(null);

        try {
            const res = await fetch("/api/admin/settings/work-hours", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(config)
            });

            if (res.ok) {
                setMessage({ type: "success", text: "Settings saved successfully!" });
            } else {
                setMessage({ type: "error", text: "Failed to save settings." });
            }
        } catch (error) {
            setMessage({ type: "error", text: "An error occurred while saving." });
        } finally {
            setSaving(false);
        }
    };

    if (loading) return (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '5rem' }}>
            <Loader2 className="animate-spin" size={48} />
        </div>
    );

    return (
        <div className="dashboardContent">
            <header className="dashboardHeader">
                <div className="welcomeSection">
                    <h1>HR <span className="text-gradient">Admin Settings</span></h1>
                    <p>Configure company-wide policies and operations.</p>
                </div>
            </header>

            <form onSubmit={handleSave} className="grid" style={{ gridTemplateColumns: '1fr', maxWidth: '800px', gap: '2rem' }}>
                <section className="card glass">
                    <div className="cardHeader">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <Clock size={24} className="text-gradient" />
                            <span className="cardTitle">Work Timings & Punctuality</span>
                        </div>
                    </div>

                    <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Shift Start Time (HH:MM)</label>
                                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                    <input
                                        type="number"
                                        min="0" max="23"
                                        value={config.workStartHour}
                                        onChange={(e) => setConfig({ ...config, workStartHour: parseInt(e.target.value) })}
                                        style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: '8px', color: 'white', width: '80px' }}
                                    />
                                    <span>:</span>
                                    <input
                                        type="number"
                                        min="0" max="59"
                                        value={config.workStartMin}
                                        onChange={(e) => setConfig({ ...config, workStartMin: parseInt(e.target.value) })}
                                        style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: '8px', color: 'white', width: '80px' }}
                                    />
                                </div>
                                <p style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>Employee check-ins after this time will be marked as LATE.</p>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Shift End Time (HH:MM)</label>
                                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                    <input
                                        type="number"
                                        min="0" max="23"
                                        value={config.workEndHour}
                                        onChange={(e) => setConfig({ ...config, workEndHour: parseInt(e.target.value) })}
                                        style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: '8px', color: 'white', width: '80px' }}
                                    />
                                    <span>:</span>
                                    <input
                                        type="number"
                                        min="0" max="59"
                                        value={config.workEndMin}
                                        onChange={(e) => setConfig({ ...config, workEndMin: parseInt(e.target.value) })}
                                        style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: '8px', color: 'white', width: '80px' }}
                                    />
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Users size={16} /> Flexible Timing Roles (Comma separated)
                                </div>
                            </label>
                            <input
                                type="text"
                                value={config.flexibleRoles}
                                onChange={(e) => setConfig({ ...config, flexibleRoles: e.target.value })}
                                placeholder="INTERN, CONTRACTOR"
                                style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: '8px', color: 'white', width: '100%' }}
                            />
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>Users with these roles will not be penalized for late check-ins.</p>
                        </div>
                    </div>
                </section>

                {message && (
                    <div className={`errorBox ${message.type === 'success' ? 'successBox' : ''}`} style={{
                        background: message.type === 'success' ? 'rgba(52, 199, 89, 0.1)' : 'rgba(255, 59, 48, 0.1)',
                        borderColor: message.type === 'success' ? 'rgba(52, 199, 89, 0.2)' : 'rgba(255, 59, 48, 0.2)',
                        color: message.type === 'success' ? '#34c759' : '#ff3b30',
                    }}>
                        {message.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                        <span>{message.text}</span>
                    </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button type="submit" className="loginButton" disabled={saving} style={{ width: 'auto', padding: '0.875rem 2rem' }}>
                        {saving ? <Loader2 className="animate-spin" size={20} /> : <><Save size={20} /> <span>Save All Settings</span></>}
                    </button>
                </div>
            </form>
        </div>
    );
}
