"use client";

import {
    GraduationCap,
    CheckCircle2,
    Circle,
    TrendingUp,
    Award,
    BookOpen,
    MoreVertical,
    Loader2
} from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import "./interns.css";

import { useState, useEffect } from "react";
import "./interns.css";

export default function InternsPage() {
    const { data: session } = useSession();
    const isAdmin = (session?.user as any)?.role === "HR_ADMIN" || (session?.user as any)?.role === "FOUNDER";
    const [interns, setInterns] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchInterns();
    }, []);

    const fetchInterns = async () => {
        setIsLoading(true);
        try {
            // Updated to fetch ALL interns performance if possible, or just the current if limited
            // For now, let's assume we fetch all for HR view which this likely is
            const res = await fetch("/api/users"); // Get all users first or a specific intern api
            if (res.ok) {
                const users = await res.json();
                const internList = users.filter((u: any) => u.role === 'INTERN');

                // For each intern, fetch their performance
                const perfPromises = internList.map(async (intern: any) => {
                    const pRes = await fetch(`/api/interns/performance?userId=${intern.id}`);
                    const pData = await pRes.json();
                    return { ...intern, ...pData };
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
    return (
        <div className="docContainer">
            <header className="dashboardHeader">
                <div className="welcomeSection">
                    <h1>Intern Management</h1>
                    <p>Track progress, discipline, and performance of the intern cohort</p>
                </div>
                {isAdmin && (
                    <Link href="/directory/onboard?role=INTERN" className="checkInButton" style={{ textDecoration: 'none' }}>
                        <GraduationCap size={18} />
                        <span>Onboard Intern</span>
                    </Link>
                )}
            </header>

            <div className="internGrid">
                {isLoading ? (
                    <div style={{ padding: '3rem', textAlign: 'center', width: '100%', gridColumn: '1/-1' }}>
                        <Loader2 className="animate-spin" size={32} />
                    </div>
                ) : interns.length > 0 ? (
                    interns.map((intern) => {
                        const onboarding = JSON.parse(intern.onboardingData || "[]");
                        return (
                            <div key={intern.id} className="internCard glass">
                                <header className="internHeader">
                                    <div className="internIdentity">
                                        <div className="internAvatar">{intern.name?.charAt(0)}</div>
                                        <div className="internIntro">
                                            <span className="internName">{intern.name}</span>
                                            <span className="internDuration">{intern.role?.replace('_', ' ')} • {intern.duration || "Month 1"}</span>
                                        </div>
                                    </div>
                                    <div className="scoreCircle">
                                        <span className="scoreValue">{intern.score || 0}</span>
                                        <span className="scoreLabel">Score</span>
                                    </div>
                                </header>

                                <div className="metricsGrid">
                                    <div className="metricItem">
                                        <span className="metricTitle">
                                            <BookOpen size={14} /> Learning Progress
                                        </span>
                                        <div className="progressBar">
                                            <div className="progressFill" style={{ width: `${intern.learningProgress || 0}%` }}></div>
                                        </div>
                                    </div>
                                    <div className="metricItem">
                                        <span className="metricTitle">
                                            <TrendingUp size={14} /> Task Completion
                                        </span>
                                        <div className="progressBar">
                                            <div className="progressFill" style={{ width: `${intern.taskCompletion || 0}%` }}></div>
                                        </div>
                                    </div>
                                </div>

                                <div className="checklist">
                                    <span className="metricTitle">Onboarding Checklist</span>
                                    {onboarding.map((item: any, idx: number) => (
                                        <div key={idx} className={`checkItem ${item.done ? 'checkItemDone' : ''}`}>
                                            {item.done ? (
                                                <CheckCircle2 size={16} className="checkIconDone" />
                                            ) : (
                                                <Circle size={16} className="checkIcon" />
                                            )}
                                            <span>{item.task}</span>
                                        </div>
                                    ))}
                                </div>

                                <footer className="conversionSection">
                                    <div>
                                        <span className="conversionTag">Conversion Risk: {intern.conversionRisk || "LOW"}</span>
                                    </div>
                                    <button className="docAction">
                                        <span>View Full Report</span>
                                        <MoreVertical size={16} />
                                    </button>
                                </footer>
                            </div>
                        );
                    })
                ) : (
                    <p style={{ gridColumn: '1/-1', textAlign: 'center', padding: '3rem', color: 'var(--text-tertiary)' }}>No interns currently in the cohort.</p>
                )}
            </div>
        </div>
    );
}
