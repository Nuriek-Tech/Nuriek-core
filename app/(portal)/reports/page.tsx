"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
    Users,
    Clock,
    Calendar,
    BarChart3,
    ArrowRight,
    Loader2,
    CalendarCheck,
    Briefcase
} from "lucide-react";
import "@/styles/reports.css";

interface SummaryData {
    totalEmployees: number;
    checkedInToday: number;
    onLeaveToday: number;
    pendingLeaves: number;
    attendanceRate: number;
}

export default function ReportsSummaryPage() {
    const [summary, setSummary] = useState<SummaryData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch("/api/reports/summary")
            .then(res => res.json())
            .then(data => {
                setSummary(data);
                setLoading(false);
            })
            .catch(err => {
                console.error("Failed to fetch reports summary", err);
                setLoading(false);
            });
    }, []);

    if (loading) {
        return (
            <div className="reportsContent" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
                <Loader2 className="animate-spin" size={48} />
            </div>
        );
    }

    return (
        <div className="reportsContent">
            <header className="reportsHeader">
                <div>
                    <h1>Operational <span className="text-gradient">Reports</span></h1>
                    <p className="subtitle">Real-time overview of workforce attendance and availability.</p>
                </div>
                <BarChart3 className="text-gradient" size={40} />
            </header>

            <div className="summaryGrid">
                <div className="card reportCard glass">
                    <div className="cardTop">
                        <span>Total Workforce</span>
                        <Users size={20} />
                    </div>
                    <div className="cardValue">{summary?.totalEmployees || 0}</div>
                    <div className="cardLabel">Active Employees</div>
                </div>

                <div className="card reportCard glass">
                    <div className="cardTop">
                        <span>Present Today</span>
                        <Clock size={20} />
                    </div>
                    <div className="cardValue">{summary?.checkedInToday || 0}</div>
                    <div className="cardLabel">{summary?.attendanceRate.toFixed(1)}% Attendance Rate</div>
                </div>

                <div className="card reportCard glass">
                    <div className="cardTop">
                        <span>On Leave</span>
                        <Calendar size={20} />
                    </div>
                    <div className="cardValue">{summary?.onLeaveToday || 0}</div>
                    <div className="cardLabel">Approved Leaves Today</div>
                </div>

                <div className="card reportCard glass">
                    <div className="cardTop">
                        <span>Pending Requests</span>
                        <CalendarCheck size={20} />
                    </div>
                    <div className="cardValue">{summary?.pendingLeaves || 0}</div>
                    <div className="cardLabel">Awaiting HR Approval</div>
                </div>
            </div>

            <div className="reportsLinks">
                <Link href="/reports/attendance" className="card linkCard glass">
                    <h2><Clock className="text-gradient" /> Attendance Reports</h2>
                    <p>Detailed breakdown of daily check-ins, late marks, and total hours worked across the organization.</p>
                    <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '500' }}>
                        View Details <ArrowRight size={16} />
                    </div>
                </Link>

                <Link href="/reports/leaves" className="card linkCard glass">
                    <h2><Briefcase className="text-gradient" /> Leave & Absence</h2>
                    <p>Track leave patterns, upcoming absences, and manage leave balances for all departments.</p>
                    <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '500' }}>
                        View Details <ArrowRight size={16} />
                    </div>
                </Link>
            </div>
        </div>
    );
}
