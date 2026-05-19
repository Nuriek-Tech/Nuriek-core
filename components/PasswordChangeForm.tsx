"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Loader2, Shield, Lock } from "lucide-react";

export default function PasswordChangeForm() {
    const { data: session, update } = useSession();
    const searchParams = useSearchParams();
    const forced = searchParams.get("changePassword") === "required";
    const mustChange = session?.user?.mustChangePassword || forced;

    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setSuccess("");

        if (newPassword !== confirmPassword) {
            setError("New passwords do not match.");
            return;
        }

        setIsLoading(true);
        try {
            const res = await fetch("/api/profile/password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    currentPassword: mustChange ? undefined : currentPassword,
                    newPassword,
                }),
            });

            const data = await res.json();
            if (!res.ok) {
                setError(data.error || "Failed to update password.");
                return;
            }

            setSuccess("Password updated successfully.");
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
            await update();
        } catch {
            setError("An unexpected error occurred.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <section className="setPanel glass setPanel--compact">
            <div className="setPanelHeader">
                <span className="setPanelTitle">
                    <span className="setPanelIcon">
                        <Shield size={18} />
                    </span>
                    Security
                </span>
                <Lock size={18} style={{ color: "var(--text-tertiary)" }} />
            </div>

            {mustChange && (
                <p className="setWarn">
                    You must set a new password before using the portal.
                </p>
            )}

            <form onSubmit={handleSubmit} className="setForm setForm--wide">
                {!mustChange && (
                    <div className="admField">
                        <label className="admLabel" htmlFor="current-pw">
                            Current password
                        </label>
                        <input
                            id="current-pw"
                            type="password"
                            className="admInput"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            required
                            autoComplete="current-password"
                        />
                    </div>
                )}
                <div className="setGrid2 setGrid2--tight">
                    <div className="admField">
                        <label className="admLabel" htmlFor="new-pw">
                            New password
                        </label>
                        <input
                            id="new-pw"
                            type="password"
                            className="admInput"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            required
                            minLength={10}
                            autoComplete="new-password"
                        />
                        <p className="setHint">Min. 10 characters.</p>
                    </div>
                    <div className="admField">
                        <label className="admLabel" htmlFor="confirm-pw">
                            Confirm
                        </label>
                        <input
                            id="confirm-pw"
                            type="password"
                            className="admInput"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                            minLength={10}
                            autoComplete="new-password"
                        />
                    </div>
                </div>
                {error && <p className="setMsg setMsg--error">{error}</p>}
                {success && <p className="setMsg setMsg--success">{success}</p>}
                <button type="submit" className="admSubmitBtn" disabled={isLoading}>
                    {isLoading ? (
                        <Loader2 className="animate-spin" size={18} />
                    ) : (
                        <span>
                            {mustChange ? "Set password & continue" : "Update password"}
                        </span>
                    )}
                </button>
            </form>
        </section>
    );
}
