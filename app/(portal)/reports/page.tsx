"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
    Clock,
    ArrowRight,
    Loader2,
    Briefcase,
    BarChart3,
    Download,
} from "lucide-react";
import "@/styles/people-hub.css";
import "@/styles/reports.css";
import type { AdminSummary, ReportAnalytics } from "@/lib/api-types";

export default function ReportsSummaryPage() {
    const [summary, setSummary] = useState<AdminSummary | null>(null);
    const [analytics, setAnalytics] = useState<ReportAnalytics | null>(null);
    const [loading, setLoading] = useState(true);
    const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));

    useEffect(() => {
        setLoading(true);
        Promise.all([
            fetch("/api/reports/summary").then((r) => r.json()),
            fetch(`/api/reports/analytics?month=${month}`).then((r) => r.json()),
        ])
            .then(([sum, ana]) => {
                setSummary(sum);
                setAnalytics(ana.error ? null : ana);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, [month]);

    const maxTrend = useMemo(
        () => Math.max(1, ...(summary?.weeklyTrend?.map((d) => d.count) ?? [1])),
        [summary]
    );

    const exportSnapshot = () => {
        const blob = new Blob(
            [JSON.stringify({ summary, analytics, exportedAt: new Date().toISOString() }, null, 2)],
            { type: "application/json" }
        );
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `nuriek-reports-${month}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    if (loading) {
        return (
            <div className="hubPage repHub repLoading">
                <Loader2 className="animate-spin" size={40} />
            </div>
        );
    }

    const rate = summary?.attendanceRate ?? 0;

    return (
        <div className="hubPage repHub">
            <header className="hubHero">
                <div className="hubHeroMain">
                    <p className="hubEyebrow">Analytics</p>
                    <h1>
                        Operational <span className="text-gradient">Reports</span>
                    </h1>
                    <p className="hubSubtitle">
                        Workforce attendance, leave trends, and HR queue health.
                    </p>
                </div>
                <div className="hubHeroActions">
                    <span className="hubStatChip">
                        <BarChart3 size={16} color="var(--nuriek-blue)" />
                        <strong>{rate.toFixed(1)}%</strong> attendance today
                    </span>
                    <button type="button" className="repExportSummaryBtn" onClick={exportSnapshot}>
                        <Download size={16} />
                        Export snapshot
                    </button>
                </div>
            </header>

            <section className="repKpiGrid6" aria-label="Today overview">
                <article className="hubKpiCard glass">
                    <span className="hubKpiLabel">Workforce</span>
                    <span className="hubKpiValue hubKpiValue--default">{summary?.totalEmployees ?? 0}</span>
                </article>
                <article className="hubKpiCard glass">
                    <span className="hubKpiLabel">Present today</span>
                    <span className="hubKpiValue hubKpiValue--green">{summary?.checkedInToday ?? 0}</span>
                </article>
                <article className="hubKpiCard glass">
                    <span className="hubKpiLabel">Late today</span>
                    <span className="hubKpiValue hubKpiValue--orange">{summary?.lateToday ?? 0}</span>
                </article>
                <article className="hubKpiCard glass">
                    <span className="hubKpiLabel">On leave</span>
                    <span className="hubKpiValue hubKpiValue--orange">{summary?.onLeaveToday ?? 0}</span>
                </article>
                <article className="hubKpiCard glass">
                    <span className="hubKpiLabel">Pending leaves</span>
                    <span className="hubKpiValue hubKpiValue--red">{summary?.pendingLeaves ?? 0}</span>
                </article>
                <article className="hubKpiCard glass">
                    <span className="hubKpiLabel">Est. not in</span>
                    <span className="hubKpiValue hubKpiValue--default">{summary?.absentEstimate ?? 0}</span>
                </article>
            </section>

            <section className="hubKpiGrid" style={{ gridTemplateColumns: "repeat(2, 1fr)" }}>
                <article className="hubKpiCard glass">
                    <span className="hubKpiLabel">Pending certificates</span>
                    <span className="hubKpiValue hubKpiValue--blue">{summary?.pendingCertificates ?? 0}</span>
                </article>
                <article className="hubKpiCard glass">
                    <span className="hubKpiLabel">Timesheets to review</span>
                    <span className="hubKpiValue hubKpiValue--blue">{summary?.pendingTimesheets ?? 0}</span>
                </article>
            </section>

            <div className="repToolbar" style={{ marginBottom: 0 }}>
                <div className="repFilterGroup">
                    <label className="repFilterLabel">Analytics month</label>
                    <input
                        type="month"
                        className="repFilterInput"
                        value={month}
                        onChange={(e) => setMonth(e.target.value)}
                    />
                </div>
            </div>

            <section className="repChartPanel glass">
                <h2 className="repChartTitle">Check-ins — last 7 days</h2>
                <div className="repBarChart">
                    {(summary?.weeklyTrend ?? []).map((d) => (
                        <div key={d.label} className="repBarCol">
                            <span className="repBarValue">{d.count}</span>
                            <div
                                className="repBar"
                                style={{ height: `${Math.max(4, (d.count / maxTrend) * 100)}%` }}
                            />
                            <span className="repBarLabel">{d.label}</span>
                        </div>
                    ))}
                </div>
            </section>

            {analytics && (
                <div className="repTwoCol">
                    <section className="repChartPanel glass">
                        <h2 className="repChartTitle">By department ({month})</h2>
                        <ul className="repInsightList">
                            {analytics.departmentStats.length === 0 ? (
                                <li className="repInsightItem">No data for this month.</li>
                            ) : (
                                analytics.departmentStats.map((d) => (
                                    <li key={d.department} className="repInsightItem">
                                        <span>{d.department}</span>
                                        <span>
                                            <strong>{d.records}</strong> logs · {d.late} late
                                        </span>
                                    </li>
                                ))
                            )}
                        </ul>
                        <p className="setHint" style={{ marginTop: "0.75rem" }}>
                            Avg hours per completed session:{" "}
                            <strong>{analytics.avgHoursPerSession}h</strong>
                        </p>
                    </section>

                    <section className="repChartPanel glass">
                        <h2 className="repChartTitle">Top late marks ({month})</h2>
                        <ul className="repInsightList">
                            {analytics.topLateEmployees.length === 0 ? (
                                <li className="repInsightItem">No late marks this month.</li>
                            ) : (
                                analytics.topLateEmployees.map((e) => (
                                    <li key={e.userId} className="repInsightItem">
                                        <span>{e.name}</span>
                                        <strong>{e.lateCount}</strong>
                                    </li>
                                ))
                            )}
                        </ul>
                        <h2 className="repChartTitle" style={{ marginTop: "1.25rem" }}>
                            Leave types
                        </h2>
                        <ul className="repInsightList">
                            {Object.entries(analytics.leaveByType).map(([type, count]) => (
                                <li key={type} className="repInsightItem">
                                    <span>{type}</span>
                                    <strong>{count}</strong>
                                </li>
                            ))}
                        </ul>
                    </section>
                </div>
            )}

            <section className="repLinkGrid">
                <Link href="/reports/attendance" className="repLinkCard glass glass-hover">
                    <h2>
                        <Clock size={22} className="text-gradient" />
                        Attendance reports
                    </h2>
                    <p>Filter by status, role, and department. Export Excel or PDF.</p>
                    <span className="repLinkFooter">
                        View details <ArrowRight size={16} />
                    </span>
                </Link>
                <Link href="/reports/leaves" className="repLinkCard glass glass-hover">
                    <h2>
                        <Briefcase size={22} className="text-gradient" />
                        Leave & absence
                    </h2>
                    <p>Date range, type, and status filters with export.</p>
                    <span className="repLinkFooter">
                        View details <ArrowRight size={16} />
                    </span>
                </Link>
            </section>
        </div>
    );
}
