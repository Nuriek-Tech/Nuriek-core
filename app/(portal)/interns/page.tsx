"use client";

import {
    GraduationCap,
    CheckCircle2,
    Circle,
    TrendingUp,
    Award,
    BookOpen,
    Loader2,
    Edit3,
    Save,
    X,
    Plus,
    Trash2,
    Users,
    AlertTriangle,
    Star,
    Target,
    Activity,
    ChevronDown,
    ChevronUp,
    UserCheck
} from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import "./interns.css";
import { useState, useEffect } from "react";

const RISK_COLORS: Record<string, string> = {
    LOW: "#34c759",
    MEDIUM: "#ff9f0a",
    HIGH: "#ff3b30"
};

const RISK_BG: Record<string, string> = {
    LOW: "rgba(52,199,89,0.12)",
    MEDIUM: "rgba(255,159,10,0.12)",
    HIGH: "rgba(255,59,48,0.12)"
};

interface ChecklistItem {
    task: string;
    done: boolean;
}

interface InternData {
    id: string;
    name: string;
    email: string;
    role: string;
    learningProgress: number;
    taskCompletion: number;
    score: number;
    conversionRisk: string;
    duration: string;
    onboardingData: string;
    profile?: {
        position?: string;
        department?: string;
        joinDate?: string;
    };
}

export default function InternsPage() {
    const { data: session } = useSession();
    const userRole = (session?.user as any)?.role;
    const isAdmin = ["HR_ADMIN", "FOUNDER", "MANAGER", "TEAM_LEAD"].includes(userRole);
    const isIntern = userRole === "INTERN";

    const [interns, setInterns] = useState<InternData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

    // Edit form state
    const [editForm, setEditForm] = useState({
        learningProgress: 0,
        taskCompletion: 0,
        score: 0,
        conversionRisk: "LOW",
        duration: "",
    });
    const [editChecklist, setEditChecklist] = useState<ChecklistItem[]>([]);
    const [newTask, setNewTask] = useState("");

    useEffect(() => {
        fetchInterns();
    }, [session]);

    const fetchInterns = async () => {
        if (!session?.user) return;
        setIsLoading(true);
        try {
            const res = await fetch("/api/users");
            if (res.ok) {
                const users = await res.json();
                let internList = users.filter((u: any) => u.role === "INTERN");

                // If viewing as intern, only fetch own data
                if (isIntern) {
                    const userId = (session.user as any).id;
                    internList = internList.filter((u: any) => u.id === userId);
                }

                const perfPromises = internList.map(async (intern: any) => {
                    try {
                        const pRes = await fetch(`/api/interns/performance?userId=${intern.id}`);
                        const pData = pRes.ok ? await pRes.json() : {};
                        return { ...intern, ...pData };
                    } catch {
                        return intern;
                    }
                });

                const results = await Promise.all(perfPromises);
                setInterns(results);
            }
        } catch (error) {
            console.error("Failed to fetch interns");
        } finally {
            setIsLoading(false);
        }
    };

    const startEdit = (intern: InternData) => {
        const onboarding: ChecklistItem[] = JSON.parse(intern.onboardingData || "[]");
        setEditForm({
            learningProgress: intern.learningProgress || 0,
            taskCompletion: intern.taskCompletion || 0,
            score: intern.score || 0,
            conversionRisk: intern.conversionRisk || "LOW",
            duration: intern.duration || "",
        });
        setEditChecklist(onboarding);
        setEditingId(intern.id);
        setExpandedId(intern.id);
    };

    const cancelEdit = () => {
        setEditingId(null);
        setNewTask("");
    };

    const toggleChecklistItem = (idx: number) => {
        setEditChecklist(prev =>
            prev.map((item, i) => i === idx ? { ...item, done: !item.done } : item)
        );
    };

    const addChecklistItem = () => {
        if (!newTask.trim()) return;
        setEditChecklist(prev => [...prev, { task: newTask.trim(), done: false }]);
        setNewTask("");
    };

    const removeChecklistItem = (idx: number) => {
        setEditChecklist(prev => prev.filter((_, i) => i !== idx));
    };

    const saveInternPerformance = async (internId: string) => {
        setIsSaving(true);
        try {
            const res = await fetch("/api/interns/performance", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    userId: internId,
                    ...editForm,
                    onboardingData: editChecklist
                })
            });

            if (res.ok) {
                setSaveSuccess(internId);
                setTimeout(() => setSaveSuccess(null), 3000);
                setEditingId(null);
                setNewTask("");
                fetchInterns();
            } else {
                alert("Failed to save. Check your permissions.");
            }
        } catch {
            alert("Failed to save performance data.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="docContainer">
            <header className="dashboardHeader">
                <div className="welcomeSection">
                    <h1>
                        {isIntern ? (
                            <><span className="text-gradient">My Performance</span></>
                        ) : (
                            <><span className="text-gradient">Intern Management</span></>
                        )}
                    </h1>
                    <p>
                        {isIntern
                            ? "Your growth metrics, onboarding progress, and performance score"
                            : "Track progress, discipline, and performance of the intern cohort"}
                    </p>
                </div>
                {isAdmin && (
                    <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                        <div style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "var(--radius-lg)", padding: "0.6rem 1.2rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            <Users size={16} style={{ color: "var(--nuriek-blue)" }} />
                            <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>{interns.length} Intern{interns.length !== 1 ? "s" : ""}</span>
                        </div>
                        <Link href="/directory/onboard?role=INTERN" className="checkInButton" style={{ textDecoration: "none" }}>
                            <GraduationCap size={18} />
                            <span>Onboard Intern</span>
                        </Link>
                    </div>
                )}
            </header>

            {/* Stats summary for Admin */}
            {isAdmin && interns.length > 0 && (
                <div className="grid" style={{ gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem", marginBottom: "2rem" }}>
                    <div className="card glass" style={{ padding: "1.2rem 1.5rem" }}>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.4rem" }}>Avg Score</div>
                        <div style={{ fontSize: "2rem", fontWeight: 700, color: "white" }}>
                            {Math.round(interns.reduce((a, i) => a + (i.score || 0), 0) / interns.length)}
                        </div>
                    </div>
                    <div className="card glass" style={{ padding: "1.2rem 1.5rem" }}>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.4rem" }}>Avg Learning</div>
                        <div style={{ fontSize: "2rem", fontWeight: 700, color: "var(--nuriek-blue)" }}>
                            {Math.round(interns.reduce((a, i) => a + (i.learningProgress || 0), 0) / interns.length)}%
                        </div>
                    </div>
                    <div className="card glass" style={{ padding: "1.2rem 1.5rem" }}>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.4rem" }}>Avg Tasks</div>
                        <div style={{ fontSize: "2rem", fontWeight: 700, color: "#34c759" }}>
                            {Math.round(interns.reduce((a, i) => a + (i.taskCompletion || 0), 0) / interns.length)}%
                        </div>
                    </div>
                    <div className="card glass" style={{ padding: "1.2rem 1.5rem" }}>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.4rem" }}>High Risk</div>
                        <div style={{ fontSize: "2rem", fontWeight: 700, color: "#ff3b30" }}>
                            {interns.filter(i => i.conversionRisk === "HIGH").length}
                        </div>
                    </div>
                </div>
            )}

            <div className="internGrid">
                {isLoading ? (
                    <div style={{ padding: "3rem", textAlign: "center", width: "100%", gridColumn: "1/-1" }}>
                        <Loader2 className="animate-spin" size={32} style={{ margin: "0 auto" }} />
                    </div>
                ) : interns.length > 0 ? (
                    interns.map((intern) => {
                        const onboarding: ChecklistItem[] = JSON.parse(intern.onboardingData || "[]");
                        const isExpanded = expandedId === intern.id;
                        const isEditing = editingId === intern.id;
                        const wasSaved = saveSuccess === intern.id;
                        const doneCount = onboarding.filter(i => i.done).length;
                        const riskColor = RISK_COLORS[intern.conversionRisk] || "#34c759";
                        const riskBg = RISK_BG[intern.conversionRisk] || "rgba(52,199,89,0.12)";

                        return (
                            <div key={intern.id} className="internCard glass" style={wasSaved ? { border: "1px solid rgba(52,199,89,0.4)" } : {}}>
                                <header className="internHeader">
                                    <div className="internIdentity">
                                        <div className="internAvatar">{intern.name?.charAt(0)}</div>
                                        <div className="internIntro">
                                            <span className="internName">{intern.name}</span>
                                            <span className="internDuration">
                                                {intern.profile?.position || "Intern"} • {intern.duration || "Month 1"}
                                                {intern.profile?.department && ` • ${intern.profile.department}`}
                                            </span>
                                        </div>
                                    </div>
                                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                                        <div className="scoreCircle">
                                            <span className="scoreValue">{intern.score || 0}</span>
                                            <span className="scoreLabel">Score</span>
                                        </div>
                                        {isAdmin && !isEditing && (
                                            <button
                                                onClick={() => startEdit(intern)}
                                                title="Edit performance"
                                                style={{
                                                    background: "rgba(10,132,255,0.12)",
                                                    border: "1px solid rgba(10,132,255,0.3)",
                                                    borderRadius: "var(--radius-md)",
                                                    padding: "0.5rem",
                                                    cursor: "pointer",
                                                    color: "var(--nuriek-blue)",
                                                    display: "flex", alignItems: "center"
                                                }}
                                            >
                                                <Edit3 size={16} />
                                            </button>
                                        )}
                                    </div>
                                </header>

                                {/* Metrics */}
                                {isEditing ? (
                                    <div style={{ marginTop: "1.5rem", display: "flex", flexDirection: "column", gap: "1.2rem" }}>
                                        {/* Score */}
                                        <div>
                                            <label style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em", display: "flex", gap: "0.4rem", alignItems: "center", marginBottom: "0.5rem" }}>
                                                <Star size={12} /> Score (0–100)
                                            </label>
                                            <input
                                                type="number" min="0" max="100"
                                                className="input"
                                                value={editForm.score}
                                                onChange={e => setEditForm(prev => ({ ...prev, score: Number(e.target.value) }))}
                                                style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "var(--radius-md)", padding: "0.6rem 0.75rem", color: "white" }}
                                            />
                                        </div>

                                        {/* Learning Progress */}
                                        <div>
                                            <label style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em", display: "flex", gap: "0.4rem", alignItems: "center", marginBottom: "0.5rem" }}>
                                                <BookOpen size={12} /> Learning Progress %
                                            </label>
                                            <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                                                <input type="range" min="0" max="100" value={editForm.learningProgress}
                                                    onChange={e => setEditForm(prev => ({ ...prev, learningProgress: Number(e.target.value) }))}
                                                    style={{ flex: 1, accentColor: "var(--nuriek-blue)" }}
                                                />
                                                <span style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--nuriek-blue)", minWidth: "2.5rem" }}>{editForm.learningProgress}%</span>
                                            </div>
                                        </div>

                                        {/* Task Completion */}
                                        <div>
                                            <label style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em", display: "flex", gap: "0.4rem", alignItems: "center", marginBottom: "0.5rem" }}>
                                                <Target size={12} /> Task Completion %
                                            </label>
                                            <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                                                <input type="range" min="0" max="100" value={editForm.taskCompletion}
                                                    onChange={e => setEditForm(prev => ({ ...prev, taskCompletion: Number(e.target.value) }))}
                                                    style={{ flex: 1, accentColor: "#34c759" }}
                                                />
                                                <span style={{ fontSize: "0.9rem", fontWeight: 600, color: "#34c759", minWidth: "2.5rem" }}>{editForm.taskCompletion}%</span>
                                            </div>
                                        </div>

                                        {/* Duration & Risk */}
                                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                                            <div>
                                                <label style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.5rem", display: "block" }}>Duration</label>
                                                <input type="text"
                                                    placeholder="e.g. Month 3 of 6"
                                                    value={editForm.duration}
                                                    onChange={e => setEditForm(prev => ({ ...prev, duration: e.target.value }))}
                                                    style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "var(--radius-md)", padding: "0.6rem 0.75rem", color: "white", fontSize: "0.875rem" }}
                                                />
                                            </div>
                                            <div>
                                                <label style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.5rem", display: "block" }}>Conversion Risk</label>
                                                <select
                                                    value={editForm.conversionRisk}
                                                    onChange={e => setEditForm(prev => ({ ...prev, conversionRisk: e.target.value }))}
                                                    style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "var(--radius-md)", padding: "0.6rem 0.75rem", color: "white", fontSize: "0.875rem" }}
                                                >
                                                    <option value="LOW" style={{ background: "#111" }}>🟢 Low</option>
                                                    <option value="MEDIUM" style={{ background: "#111" }}>🟡 Medium</option>
                                                    <option value="HIGH" style={{ background: "#111" }}>🔴 High</option>
                                                </select>
                                            </div>
                                        </div>

                                        {/* Onboarding Checklist */}
                                        <div>
                                            <label style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.75rem", display: "block" }}>
                                                Onboarding Checklist
                                            </label>
                                            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "0.75rem" }}>
                                                {editChecklist.map((item, idx) => (
                                                    <div key={idx} style={{ display: "flex", alignItems: "center", gap: "0.5rem", background: "rgba(255,255,255,0.03)", borderRadius: "var(--radius-md)", padding: "0.5rem 0.75rem" }}>
                                                        <button onClick={() => toggleChecklistItem(idx)} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", color: item.done ? "#34c759" : "var(--text-tertiary)", padding: 0 }}>
                                                            {item.done ? <CheckCircle2 size={16} /> : <Circle size={16} />}
                                                        </button>
                                                        <span style={{ flex: 1, fontSize: "0.85rem", color: item.done ? "var(--text-tertiary)" : "var(--text-primary)", textDecoration: item.done ? "line-through" : "none" }}>{item.task}</span>
                                                        <button onClick={() => removeChecklistItem(idx)} style={{ background: "none", border: "none", cursor: "pointer", color: "#ff3b30", display: "flex" }}>
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                            <div style={{ display: "flex", gap: "0.5rem" }}>
                                                <input
                                                    type="text"
                                                    placeholder="Add checklist item..."
                                                    value={newTask}
                                                    onChange={e => setNewTask(e.target.value)}
                                                    onKeyDown={e => e.key === "Enter" && addChecklistItem()}
                                                    style={{ flex: 1, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "var(--radius-md)", padding: "0.5rem 0.75rem", color: "white", fontSize: "0.85rem" }}
                                                />
                                                <button onClick={addChecklistItem} style={{ background: "var(--nuriek-blue)", border: "none", borderRadius: "var(--radius-md)", padding: "0.5rem 0.75rem", cursor: "pointer", color: "white", display: "flex", alignItems: "center" }}>
                                                    <Plus size={16} />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.5rem" }}>
                                            <button
                                                onClick={() => saveInternPerformance(intern.id)}
                                                disabled={isSaving}
                                                className="checkInButton"
                                                style={{ flex: 1, height: "2.8rem" }}
                                            >
                                                {isSaving ? <Loader2 size={18} className="animate-spin" /> : <><Save size={16} /><span>Save Changes</span></>}
                                            </button>
                                            <button
                                                onClick={cancelEdit}
                                                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "var(--radius-lg)", padding: "0 1.2rem", cursor: "pointer", color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.875rem" }}
                                            >
                                                <X size={16} /> Cancel
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div className="metricsGrid">
                                            <div className="metricItem">
                                                <span className="metricTitle">
                                                    <BookOpen size={14} /> Learning Progress
                                                </span>
                                                <div className="progressBar">
                                                    <div className="progressFill" style={{ width: `${intern.learningProgress || 0}%` }}></div>
                                                </div>
                                                <span style={{ fontSize: "0.75rem", color: "var(--nuriek-blue)", fontWeight: 600 }}>{intern.learningProgress || 0}%</span>
                                            </div>
                                            <div className="metricItem">
                                                <span className="metricTitle">
                                                    <TrendingUp size={14} /> Task Completion
                                                </span>
                                                <div className="progressBar">
                                                    <div className="progressFill" style={{ width: `${intern.taskCompletion || 0}%`, background: "linear-gradient(90deg, #34c759, #30d158)" }}></div>
                                                </div>
                                                <span style={{ fontSize: "0.75rem", color: "#34c759", fontWeight: 600 }}>{intern.taskCompletion || 0}%</span>
                                            </div>
                                        </div>

                                        {/* Expandable checklist */}
                                        <button
                                            onClick={() => setExpandedId(isExpanded ? null : intern.id)}
                                            style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "var(--radius-md)", padding: "0.6rem 0.9rem", cursor: "pointer", color: "var(--text-secondary)", fontSize: "0.82rem", marginTop: "0.75rem" }}
                                        >
                                            <span style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                                                <Activity size={14} />
                                                Onboarding Checklist ({doneCount}/{onboarding.length})
                                            </span>
                                            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                        </button>

                                        {isExpanded && (
                                            <div className="checklist" style={{ marginTop: "0.5rem" }}>
                                                {onboarding.length === 0 ? (
                                                    <p style={{ fontSize: "0.82rem", color: "var(--text-tertiary)", textAlign: "center", padding: "1rem" }}>
                                                        No checklist items yet. {isAdmin && "Click Edit to add items."}
                                                    </p>
                                                ) : onboarding.map((item, idx) => (
                                                    <div key={idx} className={`checkItem ${item.done ? "checkItemDone" : ""}`}>
                                                        {item.done ? (
                                                            <CheckCircle2 size={16} className="checkIconDone" />
                                                        ) : (
                                                            <Circle size={16} className="checkIcon" />
                                                        )}
                                                        <span>{item.task}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        <footer className="conversionSection">
                                            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                                <span className="conversionTag" style={{ background: riskBg, color: riskColor, borderColor: riskColor + "33" }}>
                                                    <AlertTriangle size={12} />
                                                    Conversion Risk: {intern.conversionRisk || "LOW"}
                                                </span>
                                            </div>
                                            {wasSaved && (
                                                <span style={{ fontSize: "0.8rem", color: "#34c759", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                                                    <CheckCircle2 size={14} /> Saved!
                                                </span>
                                            )}
                                        </footer>
                                    </>
                                )}
                            </div>
                        );
                    })
                ) : (
                    <div style={{ gridColumn: "1/-1", textAlign: "center", padding: "5rem 1rem" }}>
                        {isIntern ? (
                            <div>
                                <UserCheck size={48} style={{ opacity: 0.15, margin: "0 auto 1rem" }} />
                                <p style={{ color: "var(--text-tertiary)", fontSize: "0.95rem" }}>Your performance profile is being set up by your manager.</p>
                            </div>
                        ) : (
                            <div>
                                <GraduationCap size={48} style={{ opacity: 0.15, margin: "0 auto 1rem" }} />
                                <p style={{ color: "var(--text-tertiary)", fontSize: "0.95rem" }}>No interns currently in the cohort.</p>
                                <Link href="/directory/onboard?role=INTERN" className="checkInButton" style={{ textDecoration: "none", display: "inline-flex", marginTop: "1.5rem" }}>
                                    <Plus size={16} />
                                    <span>Onboard First Intern</span>
                                </Link>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
