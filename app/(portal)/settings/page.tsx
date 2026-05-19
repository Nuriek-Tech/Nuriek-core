"use client";

import { Suspense, useEffect } from "react";
import { useSession } from "next-auth/react";
import { User } from "lucide-react";
import PasswordChangeForm from "@/components/PasswordChangeForm";
import ProfileSettingsForm from "@/components/ProfileSettingsForm";
import UserPreferences from "@/components/UserPreferences";
import PortalAdminSettings from "@/components/PortalAdminSettings";
import { formatRoleLabel } from "@/lib/roles";
import "@/styles/people-hub.css";
import "../admin/documents/admin-documents.css";
import "./settings.css";

function SettingsContent() {
    const { data: session } = useSession();

    useEffect(() => {
        if (typeof window === "undefined") return;
        if (window.location.hash === "#super-admin") {
            requestAnimationFrame(() => {
                document.getElementById("super-admin")?.scrollIntoView({ behavior: "smooth", block: "start" });
            });
        }
    }, []);

    return (
        <div className="hubPage setHub">
            <header className="setHero">
                <div className="setHeroMain">
                    <p className="hubEyebrow">Account</p>
                    <h1>
                        Portal <span className="text-gradient">Settings</span>
                    </h1>
                    <p className="hubSubtitle setHeroSubtitle">
                        Profile, security, preferences, and HR configuration.
                    </p>
                </div>

                {session?.user && (
                    <div className="setAccountCard glass">
                        <div className="setAccountAvatar">
                            {session.user.name?.charAt(0) ?? <User size={18} />}
                        </div>
                        <div className="setAccountBody">
                            <div className="setAccountName">{session.user.name}</div>
                            <div className="setAccountMeta">{session.user.email}</div>
                            <div className="setAccountRole">
                                {formatRoleLabel(session.user.role)}
                            </div>
                        </div>
                    </div>
                )}
            </header>

            <div className="setLayout">
                <ProfileSettingsForm />

                <div className="setSideCol">
                    <Suspense
                        fallback={
                            <div className="setPanel glass setPanel--compact">
                                <p className="setLoadingText">Loading…</p>
                            </div>
                        }
                    >
                        <PasswordChangeForm />
                    </Suspense>
                    <UserPreferences />
                </div>
            </div>

            <PortalAdminSettings />
        </div>
    );
}

export default function SettingsPage() {
    return <SettingsContent />;
}
