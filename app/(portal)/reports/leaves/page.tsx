"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
    Search,
    Loader2,
    Filter,
    User,
    FileSpreadsheet,
    FileText,
    Eye,
    ArrowLeft,
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XL from "xlsx";
import ReportDetailModal from "@/components/ReportDetailModal";
import "@/styles/people-hub.css";
import "@/styles/reports.css";
import "../../admin/documents/admin-documents.css";
import type { LeaveRecord, UserSummary } from "@/lib/api-types";

type LeaveReportRow = LeaveRecord & {
    user: Pick<UserSummary, "name" | "email" | "role">;
};

function statusClass(status: string): string {
    if (status === "APPROVED") return "repStatusBadge--approved";
    if (status === "PENDING") return "repStatusBadge--pending";
    return "repStatusBadge--rejected";
}

export default function LeaveReportPage() {
    const [data, setData] = useState<LeaveReportRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState("");
    const [typeFilter, setTypeFilter] = useState("");
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedUser, setSelectedUser] = useState<
        Pick<UserSummary, "id" | "name" | "email" | "role"> | null
    >(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalData, setModalData] = useState<LeaveRecord[]>([]);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (status) params.set("status", status);
            if (typeFilter) params.set("type", typeFilter);
            if (fromDate) params.set("from", fromDate);
            if (toDate) params.set("to", toDate);
            const res = await fetch(`/api/reports/leaves?${params}`);
            const result = await res.json();
            setData(Array.isArray(result) ? result : []);
        } catch {
            setData([]);
        } finally {
            setLoading(false);
        }
    }, [status, typeFilter, fromDate, toDate]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const filteredData = data.filter(
        (item) =>
            item.user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.user.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const approved = filteredData.filter((d) => d.status === "APPROVED").length;
    const pending = filteredData.filter((d) => d.status === "PENDING").length;

    const exportToExcel = () => {
        const rows = filteredData.map((item) => ({
            Employee: item.user.name,
            Type: item.type,
            "Start Date": new Date(item.startDate).toLocaleDateString(),
            "End Date": new Date(item.endDate).toLocaleDateString(),
            Status: item.status,
            Reason: item.reason || "N/A",
        }));
        const ws = XL.utils.json_to_sheet(rows);
        const wb = XL.utils.book_new();
        XL.utils.book_append_sheet(wb, ws, "Leaves");
        XL.writeFile(wb, "Leave_Report.xlsx");
    };

    const exportToPDF = () => {
        const doc = new jsPDF();
        doc.text("Leave Report", 14, 15);
        autoTable(doc, {
            head: [["Employee", "Type", "Start", "End", "Status", "Reason"]],
            body: filteredData.map((item) => [
                item.user.name ?? "",
                item.type,
                new Date(item.startDate).toLocaleDateString(),
                new Date(item.endDate).toLocaleDateString(),
                item.status,
                item.reason || "—",
            ]),
            startY: 20,
        });
        doc.save("Leave_Report.pdf");
    };

    const handleViewDetails = (user: Pick<UserSummary, "name" | "email" | "role">) => {
        const userHistory = data
            .filter((d) => d.user.email === user.email)
            .map(({ id, type, startDate, endDate, status, reason }) => ({
                id,
                type,
                startDate,
                endDate,
                status,
                reason,
            }));
        setSelectedUser({ id: user.email ?? "", ...user });
        setModalData(userHistory);
        setIsModalOpen(true);
    };

    return (
        <div className="hubPage repHub">
            <header className="hubHero">
                <div className="hubHeroMain">
                    <Link href="/reports" className="admBackLink" aria-label="Back to reports">
                        <ArrowLeft size={18} />
                    </Link>
                    <p className="hubEyebrow">Leave</p>
                    <h1>
                        Leave <span className="text-gradient">Report</span>
                    </h1>
                    <p className="hubSubtitle">
                        Employee absences, leave types, and approval status.
                    </p>
                </div>
                <div className="repExportGroup">
                    <button
                        type="button"
                        className="repExportBtn repExportBtn--ghost"
                        onClick={exportToPDF}
                        disabled={loading || filteredData.length === 0}
                    >
                        <FileText size={18} />
                        PDF
                    </button>
                    <button
                        type="button"
                        className="repExportBtn repExportBtn--primary"
                        onClick={exportToExcel}
                        disabled={loading || filteredData.length === 0}
                    >
                        <FileSpreadsheet size={18} />
                        Excel
                    </button>
                </div>
            </header>

            <section className="repPanel glass">
                <div className="repMiniStats">
                    <span className="repMiniStat">
                        Records<strong>{filteredData.length}</strong>
                    </span>
                    <span className="repMiniStat">
                        Approved<strong>{approved}</strong>
                    </span>
                    <span className="repMiniStat">
                        Pending<strong>{pending}</strong>
                    </span>
                </div>
                <div className="repToolbar">
                    <div className="repFilterGroup">
                        <label className="repFilterLabel">From</label>
                        <input
                            type="date"
                            className="repFilterInput"
                            value={fromDate}
                            onChange={(e) => setFromDate(e.target.value)}
                        />
                    </div>
                    <div className="repFilterGroup">
                        <label className="repFilterLabel">To</label>
                        <input
                            type="date"
                            className="repFilterInput"
                            value={toDate}
                            onChange={(e) => setToDate(e.target.value)}
                        />
                    </div>
                    <div className="repFilterGroup">
                        <label className="repFilterLabel">
                            <Filter size={14} />
                            Status
                        </label>
                        <select
                            className="repFilterSelect"
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                        >
                            <option value="">All statuses</option>
                            <option value="PENDING">Pending</option>
                            <option value="APPROVED">Approved</option>
                            <option value="REJECTED">Rejected</option>
                        </select>
                    </div>
                    <div className="repFilterGroup">
                        <label className="repFilterLabel">Type</label>
                        <select
                            className="repFilterSelect"
                            value={typeFilter}
                            onChange={(e) => setTypeFilter(e.target.value)}
                        >
                            <option value="">All types</option>
                            <option value="CASUAL">Casual</option>
                            <option value="SICK">Sick</option>
                            <option value="EARNED">Earned</option>
                        </select>
                    </div>
                    <div className="repFilterGroup repFilterGroup--grow">
                        <label className="repFilterLabel">
                            <User size={14} />
                            Search
                        </label>
                        <div className="repSearchWrap">
                            <Search size={16} />
                            <input
                                type="search"
                                className="repFilterInput"
                                placeholder="Name or email…"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                    <span className="hubResultCount" style={{ marginLeft: "auto" }}>
                        {filteredData.length} records
                    </span>
                </div>

                {loading ? (
                    <div className="repLoading">
                        <Loader2 className="animate-spin" size={32} />
                    </div>
                ) : (
                    <div className="repTableWrap">
                        <table className="repDataTable">
                            <thead>
                                <tr>
                                    <th>Employee</th>
                                    <th>Type</th>
                                    <th>Start</th>
                                    <th>End</th>
                                    <th>Status</th>
                                    <th>Reason</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredData.length > 0 ? (
                                    filteredData.map((item) => (
                                        <tr key={item.id}>
                                            <td>
                                                <div className="repCellName">{item.user.name}</div>
                                                <div className="repCellEmail">{item.user.email}</div>
                                            </td>
                                            <td>{item.type}</td>
                                            <td>
                                                {new Date(item.startDate).toLocaleDateString()}
                                            </td>
                                            <td>
                                                {new Date(item.endDate).toLocaleDateString()}
                                            </td>
                                            <td>
                                                <span
                                                    className={`repStatusBadge ${statusClass(item.status)}`}
                                                >
                                                    {item.status}
                                                </span>
                                            </td>
                                            <td
                                                style={{
                                                    maxWidth: "200px",
                                                    overflow: "hidden",
                                                    textOverflow: "ellipsis",
                                                    whiteSpace: "nowrap",
                                                    color: "var(--text-secondary)",
                                                }}
                                            >
                                                {item.reason || "—"}
                                            </td>
                                            <td>
                                                <button
                                                    type="button"
                                                    className="repViewBtn"
                                                    onClick={() => handleViewDetails(item.user)}
                                                    aria-label="View details"
                                                >
                                                    <Eye size={18} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={7} className="repEmptyRow">
                                            No leave records for this selection.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            <ReportDetailModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                user={selectedUser}
                data={modalData}
                type="LEAVE"
            />
        </div>
    );
}
