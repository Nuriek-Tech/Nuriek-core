"use client";

import { useState } from "react";
import {
    User, Mail, Shield, FileText, MessageSquare, Award, Zap, TrendingUp, Edit2, Check, X, Star, Calendar
} from "lucide-react";
import "@/styles/directory.css";
import Link from "next/link";
import * as Icons from "lucide-react";

const IconHelper = ({ name, className }: { name: string; className?: string }) => {
    const Icon = (Icons as any)[name] || Icons.Award;
    return <Icon className={className || ""} size={16} />;
};

export default function ClientProfileWrapper({ user, viewerRole, isHrOrAdmin, analytics }: any) {
    const [isEditingDate, setIsEditingDate] = useState(false);
    const [joinDate, setJoinDate] = useState(user.profile?.joinDate ? new Date(user.profile.joinDate).toISOString().split('T')[0] : "");
    const [showReviewModal, setShowReviewModal] = useState(false);

    // Review State
    const [rating, setRating] = useState(5);
    const [feedback, setFeedback] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Badge State
    const [showBadgeModal, setShowBadgeModal] = useState(false);
    const [badgeName, setBadgeName] = useState("");

    // Delete State
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    const handleDateUpdate = async () => {
        try {
            const res = await fetch("/api/profile", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId: user.id, joinDate })
            });
            if (res.ok) {
                setIsEditingDate(false);
                window.location.reload();
            }
        } catch (error) {
            alert("Failed to update date");
        }
    };

    const handleReviewSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await fetch("/api/reviews", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId: user.id, rating, feedback })
            });
            window.location.reload();
        } catch (error) {
            alert("Failed to submit review");
        }
    };

    const handleBadgeAward = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await fetch("/api/badges", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId: user.id, name: badgeName })
            });
            window.location.reload();
        } catch (error) {
            alert("Failed to award badge");
        }
    };

    const handleDeleteUser = async () => {
        try {
            const res = await fetch("/api/users", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId: user.id })
            });
            if (res.ok) {
                window.location.href = "/directory";
            } else {
                const msg = await res.text();
                alert(`Failed to delete: ${msg}`);
            }
        } catch (error) {
            alert("Delete failed");
        }
    };

    return (
        <div className="profileLayout">
            <aside className="profileSidebar">
                <div className="sidebarCard glass">
                    <div className="profilePic" style={{ width: 120, height: 120, fontSize: '2.5rem' }}>
                        {user.name?.charAt(0) || "U"}
                    </div>
                    <div className="employeeInfo">
                        <h2 className="name" style={{ fontSize: '1.5rem' }}>{user.name}</h2>
                        <span className="role">{user.role.replace("_", " ")}</span>
                    </div>

                    {isHrOrAdmin && (
                        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
                            <button onClick={() => setShowReviewModal(true)} className="profileAction profileActionMain">
                                <Zap size={18} />
                                <span>Performance Review</span>
                            </button>
                            <button onClick={() => setShowBadgeModal(true)} className="profileAction">
                                <Award size={18} />
                                <span>Award Badge</span>
                            </button>
                            <button
                                onClick={() => setShowDeleteModal(true)}
                                className="profileAction"
                                style={{ color: '#ff453a', borderColor: 'rgba(255, 69, 58, 0.3)' }}
                            >
                                <Icons.Trash2 size={18} />
                                <span>Delete Employee</span>
                            </button>
                        </div>
                    )}
                </div>

                {isHrOrAdmin && (
                    <div className="sidebarCard glass" style={{ border: '1px solid rgba(var(--nuriek-blue-rgb), 0.3)' }}>
                        <div className="sectionHeader" style={{ border: 'none', padding: 0, color: 'var(--nuriek-blue)' }}>
                            <TrendingUp size={18} />
                            <span>HR Analytics</span>
                        </div>
                        <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                                <span>Attendance Rate</span>
                                <b>{analytics.attendanceRate}%</b>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                                <span>Late Marks</span>
                                <b>{analytics.lateArrivals}</b>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                                <span>Leaves Taken</span>
                                <b>{analytics.approvedLeaves} per year</b>
                            </div>
                        </div>
                    </div>
                )}

                <div className="sidebarCard glass">
                    <div className="sectionHeader" style={{ border: 'none', padding: 0 }}>
                        <Award size={18} />
                        <span>Badges & Achievements</span>
                    </div>
                    {user.badges?.length > 0 ? (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '1rem' }}>
                            {user.badges.map((badge: any) => (
                                <div key={badge.id} style={{ background: 'rgba(255,215,0,0.1)', border: '1px solid rgba(255,215,0,0.3)', padding: '0.5rem', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <IconHelper name={badge.icon} className="text-yellow-500" />
                                    <span style={{ fontSize: '0.8rem', fontWeight: 500 }}>{badge.name}</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>No badges earned yet.</p>
                    )}
                </div>
            </aside>

            <div className="profileMain">
                <section className="infoSection glass">
                    <div className="sectionHeader">
                        <User size={20} />
                        <span>Personal Information</span>
                    </div>
                    <div className="infoGrid">
                        <div className="detailItem">
                            <span className="detailLabel">Full Name</span>
                            <span className="detailValue">{user.name}</span>
                        </div>
                        <div className="detailItem">
                            <span className="detailLabel">Work Email</span>
                            <span className="detailValue">{user.email}</span>
                        </div>
                        <div className="detailItem">
                            <span className="detailLabel">Department</span>
                            <span className="detailValue">{user.profile?.department || "Core Team"}</span>
                        </div>
                        <div className="detailItem">
                            <span className="detailLabel" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                Joining Date
                                {isHrOrAdmin && !isEditingDate && (
                                    <Edit2 size={12} style={{ cursor: 'pointer', opacity: 0.5 }} onClick={() => setIsEditingDate(true)} />
                                )}
                            </span>
                            {isEditingDate ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <input
                                        type="date"
                                        value={joinDate}
                                        onChange={(e) => setJoinDate(e.target.value)}
                                        style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid #ccc', padding: '0.2rem', borderRadius: '4px' }}
                                    />
                                    <button onClick={handleDateUpdate}><Check size={16} color="#34c759" /></button>
                                    <button onClick={() => setIsEditingDate(false)}><X size={16} color="#ff453a" /></button>
                                </div>
                            ) : (
                                <span className="detailValue">
                                    {user.profile?.joinDate ? new Date(user.profile.joinDate).toLocaleDateString() : "Jan 2025"}
                                </span>
                            )}
                        </div>
                    </div>
                </section>

                <section className="infoSection glass">
                    <div className="sectionHeader">
                        <Zap size={20} />
                        <span>Performance History</span>
                    </div>
                    {user.reviews?.length > 0 ? (
                        <div className="recentLogs">
                            {user.reviews.map((review: any) => (
                                <div key={review.id} className="logItem" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '0.5rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                                        <div style={{ display: 'flex', gap: '0.25rem' }}>
                                            {[...Array(5)].map((_, i) => (
                                                <Star key={i} size={14} fill={i < review.rating ? "#FFD700" : "none"} color={i < review.rating ? "#FFD700" : "#ccc"} />
                                            ))}
                                        </div>
                                        <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>{new Date(review.createdAt).toLocaleDateString()}</span>
                                    </div>
                                    <p style={{ fontSize: '0.9rem' }}>"{review.feedback}"</p>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Reviewed by {review.reviewer.name}</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p style={{ padding: '1rem', color: 'var(--text-secondary)' }}>No performance reviews yet.</p>
                    )}
                </section>

                <section className="infoSection glass">
                    <div className="sectionHeader">
                        <FileText size={20} />
                        <span>Documents & Contracts</span>
                    </div>
                    <div className="recentLogs">
                        {user.signatures?.length > 0 ? (
                            user.signatures.map((sig: any) => (
                                <div key={sig.id} className="logItem">
                                    <div className="logInfo">
                                        <span className="logTitle">{sig.document.title}</span>
                                        <span className="logTime">Signed on {new Date(sig.signedAt).toLocaleDateString()}</span>
                                    </div>
                                    <span className="logStatus statusOnTime">Signed</span>
                                </div>
                            ))
                        ) : (
                            <div className="logItem">
                                <div className="logInfo">
                                    <span className="logTitle">Employee Contract</span>
                                    <span className="logTime">Pending Signature</span>
                                </div>
                                <span className="logStatus statusPending">Pending</span>
                            </div>
                        )}
                        <Link href="/documents" className="logItem" style={{ textDecoration: 'none', color: 'inherit' }}>
                            <div className="logInfo">
                                <span className="logTitle">View All Policies</span>
                                <span className="logTime">Go to Document Hub</span>
                            </div>
                            <FileText size={16} />
                        </Link>
                    </div>
                </section>
            </div>

            {/* Performance Review Modal */}
            {showReviewModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
                    <div className="glass" style={{ width: '400px', padding: '2rem', background: 'white', borderRadius: '12px' }}>
                        <h3 style={{ marginBottom: '1.5rem' }}>Create Performance Review</h3>
                        <form onSubmit={handleReviewSubmit}>
                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem' }}>Rating (1-5)</label>
                                <input type="number" min="1" max="5" value={rating} onChange={(e) => setRating(parseInt(e.target.value))} className="input" style={{ width: '100%' }} />
                            </div>
                            <div style={{ marginBottom: '1.5rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem' }}>Feedback</label>
                                <textarea required rows={4} value={feedback} onChange={(e) => setFeedback(e.target.value)} className="input" style={{ width: '100%' }} placeholder="Enter detailed feedback..." />
                            </div>
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <button type="submit" disabled={isSubmitting} className="checkInButton" style={{ flex: 1 }}>Submit Review</button>
                                <button type="button" onClick={() => setShowReviewModal(false)} className="checkInButton ghost" style={{ flex: 1 }}>Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Badge Modal */}
            {showBadgeModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
                    <div className="glass" style={{ width: '400px', padding: '2rem', background: 'white', borderRadius: '12px' }}>
                        <h3 style={{ marginBottom: '1.5rem' }}>Award Badge</h3>
                        <form onSubmit={handleBadgeAward}>
                            <div style={{ marginBottom: '1.5rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem' }}>Badge Name</label>
                                <select className="input" style={{ width: '100%' }} value={badgeName} onChange={(e) => setBadgeName(e.target.value)}>
                                    <option value="">Select a Badge...</option>
                                    <option value="Top Performer">Top Performer</option>
                                    <option value="Employee of the Month">Employee of the Month</option>
                                    <option value="Problem Solver">Problem Solver</option>
                                    <option value="Team Player">Team Player</option>
                                    <option value="Rising Star">Rising Star</option>
                                </select>
                            </div>
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <button type="submit" className="checkInButton" style={{ flex: 1 }}>Award Badge</button>
                                <button type="button" onClick={() => setShowBadgeModal(false)} className="checkInButton ghost" style={{ flex: 1 }}>Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
                    <div className="glass" style={{ width: '400px', padding: '2rem', background: 'white', borderRadius: '12px', border: '1px solid rgba(255, 69, 58, 0.3)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', color: '#ff453a' }}>
                            <Icons.AlertTriangle size={24} />
                            <h3 style={{ margin: 0, color: '#ff453a' }}>Delete User?</h3>
                        </div>
                        <p style={{ color: '#555', marginBottom: '1.5rem', lineHeight: '1.5' }}>
                            Are you sure you want to delete <strong>{user.name}</strong>?
                            <br /><br />
                            This action is <strong>irreversible</strong> and will remove all attendance records, documents, and performance data.
                        </p>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button
                                onClick={handleDeleteUser}
                                className="checkInButton"
                                style={{ flex: 1, background: '#ff453a', border: 'none', color: 'white' }}
                            >
                                Yes, Delete
                            </button>
                            <button
                                onClick={() => setShowDeleteModal(false)}
                                className="checkInButton ghost"
                                style={{ flex: 1 }}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
