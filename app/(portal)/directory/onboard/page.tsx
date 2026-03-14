"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
    UserPlus,
    User,
    Mail,
    Briefcase,
    Building2,
    Shield,
    ArrowLeft,
    CheckCircle2,
    Loader2
} from "lucide-react";
import Link from "next/link";
import "@/styles/dashboard.css";
import { useSession } from "next-auth/react";
import { ROLES } from "@/lib/constants";

export default function OnboardPage() {
    const router = useRouter();
    const { data: session } = useSession();
    const currentUserRole = (session?.user as any)?.role;
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [error, setError] = useState("");

    const [formData, setFormData] = useState({
        name: "",
        email: "",
        role: "EMPLOYEE",
        department: "Core Team",
        position: "",
    });

    useEffect(() => {
        // Run only in browser to avoid SSR hydration mismatch
        if (typeof window !== "undefined") {
            const params = new URLSearchParams(window.location.search);
            const roleQuery = params.get('role');
            if (roleQuery) {
                setFormData(prev => ({ ...prev, role: roleQuery, position: roleQuery === "INTERN" ? "Software Engineering Intern" : prev.position }));
            }
        }
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError("");

        try {
            const res = await fetch("/api/admin/onboard", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });

            if (res.ok) {
                setIsSuccess(true);
                setTimeout(() => router.push("/directory"), 2000);
            } else {
                const msg = await res.text();
                setError(msg || "Failed to onboard employee");
            }
        } catch (err) {
            setError("Something went wrong. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    if (isSuccess) {
        return (
            <div className="dashboardContent" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
                <div className="card glass" style={{ textAlign: 'center', padding: '3rem', maxWidth: '500px' }}>
                    <div style={{ background: 'rgba(52, 199, 89, 0.1)', color: '#34c759', width: '80px', height: '80px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                        <CheckCircle2 size={48} />
                    </div>
                    <h2 style={{ fontSize: '1.8rem', marginBottom: '1rem' }}>Onboarding Initiated!</h2>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
                        A welcome email with instructions has been sent to <strong>{formData.email}</strong>.
                        Redirecting to directory...
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="dashboardContent">
            <header className="dashboardHeader">
                <div className="welcomeSection">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                        <Link href="/directory" style={{ color: 'var(--text-secondary)' }}>
                            <ArrowLeft size={20} />
                        </Link>
                        <h1>Onboard <span className="text-gradient">New Employee</span></h1>
                    </div>
                    <p>Initialize the onboarding process and send invitation credentials</p>
                </div>
            </header>

            <form onSubmit={handleSubmit} className="card glass" style={{ maxWidth: '800px', padding: '2.5rem' }}>
                <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                    <div className="inputGroup">
                        <label className="statLabel">Full Name</label>
                        <div className="inputWrapper">
                            <User className="inputIcon" size={18} />
                            <input
                                required
                                type="text"
                                className="input"
                                placeholder="Enter full name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="inputGroup">
                        <label className="statLabel">Work Email</label>
                        <div className="inputWrapper">
                            <Mail className="inputIcon" size={18} />
                            <input
                                required
                                type="email"
                                className="input"
                                placeholder="email@nuriek.com"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="inputGroup">
                        <label className="statLabel">Initial Position</label>
                        <div className="inputWrapper">
                            <Briefcase className="inputIcon" size={18} />
                            <input
                                required
                                type="text"
                                className="input"
                                placeholder="e.g. Frontend Engineer"
                                value={formData.position}
                                onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="inputGroup">
                        <label className="statLabel">Department</label>
                        <div className="inputWrapper">
                            <Building2 className="inputIcon" size={18} />
                            <select
                                className="input"
                                style={{ appearance: 'none' }}
                                value={formData.department}
                                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                            >
                                <option>Core Team</option>
                                <option>HR</option>
                                <option>Engineering</option>
                                <option>Design</option>
                                <option>Marketing</option>
                            </select>
                        </div>
                    </div>

                    <div className="inputGroup">
                        <label className="statLabel">Role</label>
                        <div className="inputWrapper">
                            <Shield className="inputIcon" size={18} />
                            <select
                                className="input"
                                style={{ appearance: 'none' }}
                                value={formData.role}
                                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                            >
                                <option value="EMPLOYEE">Employee</option>
                                <option value="INTERN">Intern</option>
                                <option value="CONTRACTOR">Contractor</option>
                                <option value="TEAM_LEAD">Team Lead</option>
                                <option value="MANAGER">Manager</option>
                                {currentUserRole === ROLES.FOUNDER && (
                                    <>
                                        <option value="HR_ADMIN">HR Admin</option>
                                        <option value="FOUNDER">Founder / Admin</option>
                                    </>
                                )}
                            </select>
                        </div>
                    </div>
                </div>

                {error && (
                    <div style={{ marginTop: '2rem', padding: '1rem', background: 'rgba(255, 69, 58, 0.1)', color: '#ff453a', borderRadius: 'var(--radius-md)', fontSize: '0.9rem', textAlign: 'center' }}>
                        {error}
                    </div>
                )}

                <div style={{ marginTop: '3rem', display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                    <Link href="/directory" className="docAction" style={{ padding: '0.75rem 2rem' }}>
                        Cancel
                    </Link>
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="checkInButton"
                        style={{ padding: '0.75rem 3rem' }}
                    >
                        {isLoading ? (
                            <Loader2 className="animate-spin" size={20} />
                        ) : (
                            <>
                                <UserPlus size={18} />
                                <span>Complete Onboarding</span>
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}
