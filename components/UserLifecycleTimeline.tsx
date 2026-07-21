"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, FileText, Send, UserCheck, UserX, Loader2, PlayCircle, Clock } from "lucide-react";

interface AuditLog {
    id: string;
    actorEmail: string | null;
    action: string;
    createdAt: string;
    metadata: string | null;
}

interface OfferLetter {
    id: string;
    createdAt: string;
    emailedAt: string | null;
    signedAt: string | null;
    status: string;
}

interface TimelineEvent {
    id: string;
    date: Date;
    title: string;
    description: string;
    icon: React.ReactNode;
    color: string;
}

export default function UserLifecycleTimeline({ userId }: { userId: string }) {
    const [events, setEvents] = useState<TimelineEvent[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchLifecycle() {
            try {
                const res = await fetch(`/api/users/${userId}/lifecycle`);
                if (!res.ok) throw new Error("Failed to load");
                const data = await res.json();
                
                const rawLogs: AuditLog[] = data.logs || [];
                const offerLetters: OfferLetter[] = data.offerLetters || [];

                const processedEvents: TimelineEvent[] = [];

                // Add offer letter events
                offerLetters.forEach(ol => {
                    processedEvents.push({
                        id: `ol_created_${ol.id}`,
                        date: new Date(ol.createdAt),
                        title: "Offer Letter Created",
                        description: `Offer letter generated.`,
                        icon: <FileText size={16} />,
                        color: "var(--nuriek-blue)"
                    });
                    
                    if (ol.emailedAt) {
                        processedEvents.push({
                            id: `ol_sent_${ol.id}`,
                            date: new Date(ol.emailedAt),
                            title: "Offer Letter Sent",
                            description: `Onboarding email dispatched to candidate.`,
                            icon: <Send size={16} />,
                            color: "var(--nuriek-orange)"
                        });
                    }

                    if (ol.signedAt) {
                        processedEvents.push({
                            id: `ol_signed_${ol.id}`,
                            date: new Date(ol.signedAt),
                            title: "Offer Letter Signed",
                            description: `Candidate signed the offer letter.`,
                            icon: <CheckCircle2 size={16} />,
                            color: "var(--nuriek-green)"
                        });
                    }
                });

                // Add audit events
                rawLogs.forEach(log => {
                    let title = log.action;
                    let description = "";
                    let icon = <Clock size={16} />;
                    let color = "var(--text-secondary)";

                    switch (log.action) {
                        case "INTERN_CONVERT":
                            title = "Converted to Full-Time";
                            icon = <UserCheck size={16} />;
                            color = "var(--nuriek-green)";
                            if (log.metadata) {
                                try {
                                    const meta = JSON.parse(log.metadata);
                                    if (meta.position) description += `Position: ${meta.position}. `;
                                } catch (e) {}
                            }
                            break;
                        case "FINISH_LETTER_SENT":
                            title = "Finish Letter Sent";
                            icon = <Send size={16} />;
                            color = "var(--nuriek-blue)";
                            break;
                        case "USER_DEACTIVATED":
                        case "EMPLOYEE_EXITED":
                            title = "User Deactivated / Exited";
                            icon = <UserX size={16} />;
                            color = "var(--nuriek-red)";
                            break;
                    }

                    if (log.actorEmail) {
                        description += `(Action by ${log.actorEmail})`;
                    }

                    processedEvents.push({
                        id: log.id,
                        date: new Date(log.createdAt),
                        title,
                        description: description.trim(),
                        icon,
                        color
                    });
                });

                // Sort by date descending
                processedEvents.sort((a, b) => b.date.getTime() - a.date.getTime());
                setEvents(processedEvents);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        }
        
        if (userId) {
            fetchLifecycle();
        }
    }, [userId]);

    if (loading) {
        return (
            <div style={{ display: "flex", justifyContent: "center", padding: "2rem" }}>
                <Loader2 className="animate-spin text-gray-400" size={24} />
            </div>
        );
    }

    if (events.length === 0) {
        return (
            <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-secondary)" }}>
                No lifecycle events recorded for this user.
            </div>
        );
    }

    return (
        <div style={{ marginTop: "2rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 600, color: "var(--text-primary)" }}>
                Lifecycle History
            </h3>
            <div style={{ position: "relative", paddingLeft: "1rem" }}>
                <div style={{ position: "absolute", left: "1.45rem", top: "0.5rem", bottom: "0.5rem", width: "2px", background: "var(--border)" }} />
                <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                    {events.map((evt, idx) => (
                        <div key={`${evt.id}-${idx}`} style={{ display: "flex", gap: "1rem", position: "relative", zIndex: 1 }}>
                            <div style={{ width: "2rem", height: "2rem", borderRadius: "50%", background: "var(--surface)", display: "flex", alignItems: "center", justifyContent: "center", border: `2px solid ${evt.color}`, color: evt.color, flexShrink: 0, marginTop: "0.2rem" }}>
                                {evt.icon}
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", paddingTop: "0.25rem" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                                    <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{evt.title}</span>
                                    <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                                        {evt.date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })} at {evt.date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                                    </span>
                                </div>
                                {evt.description && (
                                    <span style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}>{evt.description}</span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
