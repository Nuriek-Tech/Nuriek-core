"use client";

import {
    Settings as SettingsIcon,
    User,
    Bell,
    Shield,
    Globe,
    Palette,
    Monitor,
    ChevronRight,
    Save
} from "lucide-react";
import "@/styles/dashboard.css";

export default function SettingsPage() {
    const settingsSections = [
        { title: "Profile Settings", desc: "Update your avatar, name, and basic info", icon: User },
        { title: "Notifications", desc: "Manage email and push notification preferences", icon: Bell },
        { title: "Security", desc: "Change password and enable 2FA", icon: Shield },
        { title: "Display & Language", desc: "System theme and language localization", icon: Globe },
        { title: "Appearance", desc: "Customize accent colors and UI density", icon: Palette },
        { title: "Connected Devices", desc: "Manage your active login sessions", icon: Monitor },
    ];

    return (
        <div className="dashboardContent">
            <header className="dashboardHeader">
                <div className="welcomeSection">
                    <h1>Portal <span className="text-gradient">Settings</span></h1>
                    <p>Customize your workspace experience and security</p>
                </div>
                <button className="checkInButton">
                    <Save size={18} />
                    <span>Save Changes</span>
                </button>
            </header>

            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.5rem' }}>
                {settingsSections.map(section => (
                    <section key={section.title} className="card glass" style={{ cursor: 'pointer', transition: 'transform 0.2s' }}>
                        <div className="cardHeader" style={{ border: 'none', paddingBottom: 0 }}>
                            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                <div style={{
                                    width: 48, height: 48, borderRadius: 'var(--radius-lg)',
                                    background: 'rgba(var(--nuriek-blue-rgb), 0.1)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: 'var(--nuriek-blue)'
                                }}>
                                    <section.icon size={24} />
                                </div>
                                <div className="logInfo">
                                    <span className="logTitle" style={{ fontSize: '1.1rem' }}>{section.title}</span>
                                    <p style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)', marginTop: '0.2rem' }}>{section.desc}</p>
                                </div>
                            </div>
                            <ChevronRight size={20} style={{ opacity: 0.3 }} />
                        </div>
                    </section>
                ))}
            </div>

            <section className="card glass" style={{ marginTop: '2rem', border: '1px solid rgba(255, 69, 58, 0.2)' }}>
                <div className="cardHeader">
                    <span className="cardTitle" style={{ color: '#ff453a' }}>Danger Zone</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h4 style={{ fontWeight: 600 }}>Deactivate Account</h4>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)' }}>This will temporarily disable your portal access. Contact HR to reactivation.</p>
                    </div>
                    <button style={{
                        padding: '0.75rem 1.5rem',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid #ff453a',
                        color: '#ff453a',
                        background: 'none',
                        fontWeight: 600,
                        cursor: 'pointer'
                    }}>
                        Deactivate
                    </button>
                </div>
            </section>
        </div>
    );
}
