"use client";

import {
    GraduationCap,
    CheckCircle2,
    Circle,
    TrendingUp,
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
    UserCheck,
    Clock,
    ExternalLink,
} from "lucide-react";
import { daysInSystem, resolveInternStartDate } from "@/lib/intern-tenure";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useState, useEffect, useCallback, useMemo } from "react";
import type { InternPerformance, UserSummary } from "@/lib/api-types";
import "@/styles/people-hub.css";
import "./interns.css";

interface ChecklistItem {
    task: string;
    done: boolean;
}

interface InternData extends UserSummary, Partial<InternPerformance> {
    email: string;
    profile?: {
        position?: string;
        department?: string;
        joinDate?: string;
    };
    history?: {
        sentAt: string;
        sentBy: string | null;
    };
}

function riskClass(risk: string): string {
    const k = (risk || "LOW").toLowerCase();
    if (k === "high") return "internRiskBadge--high";
    if (k === "medium") return "internRiskBadge--medium";
    return "internRiskBadge--low";
}

export default function InternsPage() {
    const { data: session } = useSession();
    const userRole = session?.user?.role;
    const isAdmin =
        userRole === "HR_ADMIN" ||
        userRole === "FOUNDER" ||
        userRole === "MANAGER" ||
        userRole === "TEAM_LEAD";
    const isIntern = userRole === "INTERN";

    const [interns, setInterns] = useState<InternData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
    const [riskFilter, setRiskFilter] = useState("ALL");
    const [viewMode, setViewMode] = useState<"ACTIVE" | "HISTORY">("ACTIVE");

    const [editForm, setEditForm] = useState({
        learningProgress: 0,
        taskCompletion: 0,
        score: 0,
        conversionRisk: "LOW",
        duration: "",
    });
    const [editChecklist, setEditChecklist] = useState<ChecklistItem[]>([]);
    const [newTask, setNewTask] = useState("");

    const fetchInterns = useCallback(async () => {
        if (!session?.user) return;
        setIsLoading(true);
        try {
            const res = await fetch("/api/users");
            if (res.ok) {
                const users: UserSummary[] = await res.json();
                let internList = users.filter((u) => u.role === "INTERN");

                if (isIntern) {
                    internList = internList.filter((u) => u.id === session.user.id);
                }

                let historyMap: Record<string, { sentAt: string; sentBy: string | null }> = {};
                if (isAdmin) {
                    try {
                        const hRes = await fetch("/api/interns/history");
                        if (hRes.ok) {
                            historyMap = await hRes.json();
                        }
                    } catch (e) {
                        console.error("Failed to fetch intern history", e);
                    }
                }

                const perfPromises = internList.map(async (intern) => {
                    try {
                        const pRes = await fetch(
                            `/api/interns/performance?userId=${intern.id}`
                        );
                        const pData: Partial<InternPerformance> = pRes.ok
                            ? await pRes.json()
                            : {};
                        return {
                            ...intern,
                            email: intern.email ?? "",
                            ...pData,
                            history: historyMap[intern.id]
                        } as InternData;
                    } catch {
                        return { ...intern, email: intern.email ?? "", history: historyMap[intern.id] } as InternData;
                    }
                });

                setInterns(await Promise.all(perfPromises));
            }
        } catch {
            console.error("Failed to fetch interns");
        } finally {
            setIsLoading(false);
        }
    }, [session, isIntern]);

    useEffect(() => {
        fetchInterns();
    }, [fetchInterns]);

    const activeInterns = useMemo(() => interns.filter(i => i.isActive !== false), [interns]);
    const historyInterns = useMemo(() => interns.filter(i => i.isActive === false), [interns]);

    const displayedInterns = useMemo(() => {
        const list = viewMode === "ACTIVE" ? activeInterns : historyInterns;
        if (riskFilter === "ALL") return list;
        return list.filter((i) => (i.conversionRisk || "LOW") === riskFilter);
    }, [activeInterns, historyInterns, riskFilter, viewMode]);

    const avgScore =
        activeInterns.length > 0
            ? Math.round(activeInterns.reduce((a, i) => a + (i.score || 0), 0) / activeInterns.length)
            : 0;
    const avgLearning =
        activeInterns.length > 0
            ? Math.round(
                  activeInterns.reduce((a, i) => a + (i.learningProgress || 0), 0) / activeInterns.length
              )
            : 0;
    const avgTasks =
        activeInterns.length > 0
            ? Math.round(
                  activeInterns.reduce((a, i) => a + (i.taskCompletion || 0), 0) / activeInterns.length
              )
            : 0;
    const highRiskCount = activeInterns.filter((i) => i.conversionRisk === "HIGH").length;

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
        setEditChecklist((prev) =>
            prev.map((item, i) => (i === idx ? { ...item, done: !item.done } : item))
        );
    };

    const addChecklistItem = () => {
        if (!newTask.trim()) return;
        setEditChecklist((prev) => [...prev, { task: newTask.trim(), done: false }]);
        setNewTask("");
    };

    const removeChecklistItem = (idx: number) => {
        setEditChecklist((prev) => prev.filter((_, i) => i !== idx));
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
                    onboardingData: editChecklist,
                }),
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
        <div className="hubPage">
            <header className="hubHero">
                <div className="hubHeroMain">
                    <p className="hubEyebrow">{isIntern ? "Growth" : "Talent"}</p>
                    <h1>
                        {isIntern ? (
                            <span className="text-gradient">My Performance</span>
                        ) : (
                            <>
                                Intern <span className="text-gradient">Management</span>
                            </>
                        )}
                    </h1>
                    <p className="hubSubtitle">
                        {isIntern
                            ? "Your learning progress, tasks, onboarding checklist, and performance score."
                            : "Track intern cohort progress, conversion risk, and onboarding milestones."}
                    </p>
                </div>
                {isAdmin && (
                    <div className="hubHeroActions">
                        <span className="hubStatChip">
                            <Users size={16} color="var(--nuriek-blue)" />
                            <strong>{activeInterns.length}</strong> active intern
                            {activeInterns.length !== 1 ? "s" : ""}
                        </span>
                        <Link
                            href="/directory/onboard?role=INTERN"
                            className="hubBtnPrimary"
                        >
                            <GraduationCap size={18} />
                            Onboard intern
                        </Link>
                    </div>
                )}
            </header>

            {isAdmin && (
                <div style={{ borderBottom: "1px solid var(--border)", marginBottom: "1.5rem" }}>
                    <div style={{ display: "flex", gap: "2rem" }}>
                        <button
                            className={`hubTab ${viewMode === "ACTIVE" ? "hubTab--active" : ""}`}
                            onClick={() => setViewMode("ACTIVE")}
                        >
                            Active Cohort ({activeInterns.length})
                        </button>
                        <button
                            className={`hubTab ${viewMode === "HISTORY" ? "hubTab--active" : ""}`}
                            onClick={() => setViewMode("HISTORY")}
                        >
                            History & Alumni ({historyInterns.length})
                        </button>
                    </div>
                </div>
            )}

            {isAdmin && activeInterns.length > 0 && viewMode === "ACTIVE" && (
                <section className="hubKpiGrid" aria-label="Cohort summary">
                    <article className="hubKpiCard glass">
                        <span className="hubKpiLabel">Avg score</span>
                        <span className="hubKpiValue hubKpiValue--default">{avgScore}</span>
                    </article>
                    <article className="hubKpiCard glass">
                        <span className="hubKpiLabel">Avg learning</span>
                        <span className="hubKpiValue hubKpiValue--blue">{avgLearning}%</span>
                    </article>
                    <article className="hubKpiCard glass">
                        <span className="hubKpiLabel">Avg tasks</span>
                        <span className="hubKpiValue hubKpiValue--green">{avgTasks}%</span>
                    </article>
                    <article className="hubKpiCard glass">
                        <span className="hubKpiLabel">High risk</span>
                        <span className="hubKpiValue hubKpiValue--red">{highRiskCount}</span>
                    </article>
                </section>
            )}

            {isAdmin && (viewMode === "ACTIVE" ? activeInterns.length > 0 : historyInterns.length > 0) && (
                <div className="hubToolbar">
                    <div className="hubFilters" role="group" aria-label="Filter by risk">
                        {["ALL", "LOW", "MEDIUM", "HIGH"].map((r) => (
                            <button
                                key={r}
                                type="button"
                                className={`hubFilterPill ${riskFilter === r ? "hubFilterPill--active" : ""}`}
                                onClick={() => setRiskFilter(r)}
                            >
                                {r === "ALL" ? "All risk levels" : `${r.charAt(0)}${r.slice(1).toLowerCase()} risk`}
                            </button>
                        ))}
                    </div>
                    <span className="hubResultCount">
                        {displayedInterns.length} of {viewMode === "ACTIVE" ? activeInterns.length : historyInterns.length}
                    </span>
                </div>
            )}

            <div className="internGrid">
                {isLoading ? (
                    <div className="hubLoading">
                        <Loader2 className="animate-spin" size={32} />
                    </div>
                ) : displayedInterns.length > 0 ? (
                    displayedInterns.map((intern) => {
                        const onboarding: ChecklistItem[] = JSON.parse(
                            intern.onboardingData || "[]"
                        );
                        const isExpanded = expandedId === intern.id;
                        const isEditing = editingId === intern.id;
                        const wasSaved = saveSuccess === intern.id;
                        const doneCount = onboarding.filter((i) => i.done).length;
                        const riskKey = intern.conversionRisk ?? "LOW";

                        return (
                            <article
                                key={intern.id}
                                className={`internCard glass ${wasSaved ? "internCard--saved" : ""}`}
                            >
                                <header className="internHeader">
                                    <div className="internIdentity">
                                        <div className="internAvatar">
                                            {intern.name?.charAt(0) ?? "?"}
                                        </div>
                                        <div className="internIntro">
                                            <span className="internName">{intern.name}</span>
                                            <span className="internMeta">
                                                {intern.profile?.position || "Intern"}
                                                {intern.duration ? ` · ${intern.duration}` : ""}
                                                {intern.profile?.department
                                                    ? ` · ${intern.profile.department}`
                                                    : ""}
                                            </span>
                                            {(() => {
                                                const start = resolveInternStartDate(
                                                    intern.profile?.joinDate,
                                                    intern.createdAt ?? new Date().toISOString()
                                                );
                                                const days = daysInSystem(start);
                                                return (
                                                    <span className="internTenurePill">
                                                        <Clock size={12} />
                                                        {days} day{days === 1 ? "" : "s"} in system
                                                    </span>
                                                );
                                            })()}
                                            <Link
                                                href={`/interns/${intern.id}`}
                                                className="internProfileLink"
                                            >
                                                View full profile <ExternalLink size={12} />
                                            </Link>
                                        </div>
                                    </div>
                                    <div className="internHeaderActions">
                                        {intern.history?.sentAt && (
                                            <div className="internSentBadge" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--nuriek-green)', background: 'rgba(52, 199, 89, 0.1)', padding: '0.2rem 0.6rem', borderRadius: '1rem', whiteSpace: 'nowrap' }}>
                                                <CheckCircle2 size={12} /> Letter Sent: {new Date(intern.history.sentAt).toLocaleDateString()}
                                            </div>
                                        )}
                                        <div className="internScoreRing">
                                            <span className="internScoreValue">
                                                {intern.score || 0}
                                            </span>
                                            <span className="internScoreLabel">Score</span>
                                        </div>
                                        {isAdmin && !isEditing && intern.isActive !== false && (
                                            <button
                                                type="button"
                                                className="internEditBtn"
                                                onClick={() => startEdit(intern)}
                                                title="Edit performance"
                                                aria-label="Edit performance"
                                            >
                                                <Edit3 size={16} />
                                            </button>
                                        )}
                                    </div>
                                </header>

                                {isEditing ? (
                                    <div className="internForm">
                                        <div>
                                            <label className="internFormLabel">
                                                <Star size={12} /> Score (0–100)
                                            </label>
                                            <input
                                                type="number"
                                                min={0}
                                                max={100}
                                                className="internFormInput"
                                                value={editForm.score}
                                                onChange={(e) =>
                                                    setEditForm((p) => ({
                                                        ...p,
                                                        score: Number(e.target.value),
                                                    }))
                                                }
                                            />
                                        </div>

                                        <div>
                                            <label className="internFormLabel">
                                                <BookOpen size={12} /> Learning progress
                                            </label>
                                            <div className="internRangeRow">
                                                <input
                                                    type="range"
                                                    min={0}
                                                    max={100}
                                                    value={editForm.learningProgress}
                                                    onChange={(e) =>
                                                        setEditForm((p) => ({
                                                            ...p,
                                                            learningProgress: Number(
                                                                e.target.value
                                                            ),
                                                        }))
                                                    }
                                                />
                                                <span className="internRangeVal">
                                                    {editForm.learningProgress}%
                                                </span>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="internFormLabel">
                                                <Target size={12} /> Task completion
                                            </label>
                                            <div className="internRangeRow">
                                                <input
                                                    type="range"
                                                    min={0}
                                                    max={100}
                                                    value={editForm.taskCompletion}
                                                    onChange={(e) =>
                                                        setEditForm((p) => ({
                                                            ...p,
                                                            taskCompletion: Number(
                                                                e.target.value
                                                            ),
                                                        }))
                                                    }
                                                    style={{ accentColor: "#34c759" }}
                                                />
                                                <span className="internRangeVal internRangeVal--tasks">
                                                    {editForm.taskCompletion}%
                                                </span>
                                            </div>
                                        </div>

                                        <div className="internFormRow">
                                            <div>
                                                <label className="internFormLabel">Duration</label>
                                                <input
                                                    type="text"
                                                    className="internFormInput"
                                                    placeholder="e.g. Month 3 of 6"
                                                    value={editForm.duration}
                                                    onChange={(e) =>
                                                        setEditForm((p) => ({
                                                            ...p,
                                                            duration: e.target.value,
                                                        }))
                                                    }
                                                />
                                            </div>
                                            <div>
                                                <label className="internFormLabel">
                                                    Conversion risk
                                                </label>
                                                <select
                                                    className="internFormSelect"
                                                    value={editForm.conversionRisk}
                                                    onChange={(e) =>
                                                        setEditForm((p) => ({
                                                            ...p,
                                                            conversionRisk: e.target.value,
                                                        }))
                                                    }
                                                >
                                                    <option value="LOW">Low</option>
                                                    <option value="MEDIUM">Medium</option>
                                                    <option value="HIGH">High</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="internFormLabel">
                                                Onboarding checklist
                                            </label>
                                            <div className="internChecklistEdit">
                                                {editChecklist.map((item, idx) => (
                                                    <div
                                                        key={idx}
                                                        className="internChecklistEditItem"
                                                    >
                                                        <button
                                                            type="button"
                                                            className={`internChecklistToggle ${item.done ? "done" : ""}`}
                                                            onClick={() =>
                                                                toggleChecklistItem(idx)
                                                            }
                                                        >
                                                            {item.done ? (
                                                                <CheckCircle2 size={16} />
                                                            ) : (
                                                                <Circle size={16} />
                                                            )}
                                                        </button>
                                                        <span
                                                            className={
                                                                item.done ? "done" : ""
                                                            }
                                                        >
                                                            {item.task}
                                                        </span>
                                                        <button
                                                            type="button"
                                                            className="internChecklistRemove"
                                                            onClick={() =>
                                                                removeChecklistItem(idx)
                                                            }
                                                            aria-label="Remove item"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="internAddRow">
                                                <input
                                                    type="text"
                                                    className="internFormInput"
                                                    placeholder="Add checklist item…"
                                                    value={newTask}
                                                    onChange={(e) => setNewTask(e.target.value)}
                                                    onKeyDown={(e) =>
                                                        e.key === "Enter" && addChecklistItem()
                                                    }
                                                />
                                                <button
                                                    type="button"
                                                    className="internAddBtn"
                                                    onClick={addChecklistItem}
                                                    aria-label="Add item"
                                                >
                                                    <Plus size={16} />
                                                </button>
                                            </div>
                                        </div>

                                        <div className="internFormActions">
                                            <button
                                                type="button"
                                                className="internSaveBtn"
                                                onClick={() =>
                                                    saveInternPerformance(intern.id)
                                                }
                                                disabled={isSaving}
                                            >
                                                {isSaving ? (
                                                    <Loader2
                                                        size={18}
                                                        className="animate-spin"
                                                    />
                                                ) : (
                                                    <>
                                                        <Save size={16} />
                                                        Save changes
                                                    </>
                                                )}
                                            </button>
                                            <button
                                                type="button"
                                                className="internCancelBtn"
                                                onClick={cancelEdit}
                                            >
                                                <X size={16} /> Cancel
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div className="internMetrics">
                                            <div className="internMetric">
                                                <span className="internMetricLabel">
                                                    <BookOpen size={14} /> Learning
                                                </span>
                                                <div className="internProgressTrack">
                                                    <div
                                                        className="internProgressFill"
                                                        style={{
                                                            width: `${intern.learningProgress || 0}%`,
                                                        }}
                                                    />
                                                </div>
                                                <span className="internMetricPct internMetricPct--learn">
                                                    {intern.learningProgress || 0}%
                                                </span>
                                            </div>
                                            <div className="internMetric">
                                                <span className="internMetricLabel">
                                                    <TrendingUp size={14} /> Tasks
                                                </span>
                                                <div className="internProgressTrack">
                                                    <div
                                                        className="internProgressFill internProgressFill--tasks"
                                                        style={{
                                                            width: `${intern.taskCompletion || 0}%`,
                                                        }}
                                                    />
                                                </div>
                                                <span className="internMetricPct internMetricPct--tasks">
                                                    {intern.taskCompletion || 0}%
                                                </span>
                                            </div>
                                        </div>

                                        <button
                                            type="button"
                                            className="internCheckToggle"
                                            onClick={() =>
                                                setExpandedId(isExpanded ? null : intern.id)
                                            }
                                        >
                                            <span className="internCheckToggleLeft">
                                                <Activity size={14} />
                                                Onboarding ({doneCount}/{onboarding.length})
                                            </span>
                                            {isExpanded ? (
                                                <ChevronUp size={14} />
                                            ) : (
                                                <ChevronDown size={14} />
                                            )}
                                        </button>

                                        {isExpanded && (
                                            <div className="internChecklist">
                                                {onboarding.length === 0 ? (
                                                    <p
                                                        style={{
                                                            fontSize: "0.82rem",
                                                            color: "var(--text-tertiary)",
                                                            textAlign: "center",
                                                            padding: "0.75rem",
                                                        }}
                                                    >
                                                        No checklist items yet.
                                                        {isAdmin && " Click Edit to add items."}
                                                    </p>
                                                ) : (
                                                    onboarding.map((item, idx) => (
                                                        <div
                                                            key={idx}
                                                            className={`internCheckItem ${item.done ? "internCheckItem--done" : ""}`}
                                                        >
                                                            {item.done ? (
                                                                <CheckCircle2
                                                                    size={16}
                                                                    className="internCheckIcon--done"
                                                                />
                                                            ) : (
                                                                <Circle
                                                                    size={16}
                                                                    className="internCheckIcon"
                                                                />
                                                            )}
                                                            <span>{item.task}</span>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        )}

                                        <footer className="internFooter">
                                            <span
                                                className={`internRiskBadge ${riskClass(riskKey)}`}
                                            >
                                                <AlertTriangle size={12} />
                                                {riskKey} risk
                                            </span>
                                            {wasSaved && (
                                                <span className="internSavedMsg">
                                                    <CheckCircle2 size={14} /> Saved
                                                </span>
                                            )}
                                        </footer>
                                    </>
                                )}
                            </article>
                        );
                    })
                ) : (
                    <div className="internEmpty">
                        {isIntern ? (
                            <>
                                <UserCheck size={48} className="hubEmptyIcon" />
                                <p>
                                    Your performance profile is being set up by your manager.
                                </p>
                            </>
                        ) : (
                            <>
                                <GraduationCap size={48} className="hubEmptyIcon" />
                                <p>
                                    {riskFilter !== "ALL"
                                        ? "No interns match this risk filter."
                                        : viewMode === "HISTORY" ? "No historical interns found." : "No interns in the cohort yet."}
                                </p>
                                {riskFilter === "ALL" && viewMode === "ACTIVE" && (
                                    <Link
                                        href="/directory/onboard?role=INTERN"
                                        className="hubBtnPrimary"
                                        style={{
                                            display: "inline-flex",
                                            marginTop: "1.25rem",
                                        }}
                                    >
                                        <Plus size={16} />
                                        Onboard first intern
                                    </Link>
                                )}
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
