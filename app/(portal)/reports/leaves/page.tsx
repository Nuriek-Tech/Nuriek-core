"use client";

import { useState, useEffect, useCallback } from "react";
import {
    Briefcase,
    Search,
    Download,
    Loader2,
    Filter,
    User,
    FileSpreadsheet,
    FileText,
    Eye
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XL from "xlsx";
import ReportDetailModal from "@/components/ReportDetailModal";
import "@/styles/reports.css";

export default function LeaveReportPage() {
    const [data, setData] = useState<{ id: string; type: string; startDate: string; endDate: string; status: string; reason: string | null; user: { name: string; email: string; role: string } }[]>([]);
    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState("");
    const [searchTerm, setSearchTerm] = useState("");

    // Modal State
    const [selectedUser, setSelectedUser] = useState<any>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalData, setModalData] = useState<any[]>([]);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/reports/leaves?status=${status}`);
            const result = await res.json();
            if (Array.isArray(result)) {
                setData(result);
            } else {
                console.error("API returned non-array:", result);
                setData([]);
            }
        } catch (error) {
            console.error("Failed to fetch leaves report", error);
            setData([]);
        } finally {
            setLoading(false);
        }
    }, [status]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const filteredData = data.filter(item =>
        item.user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.user.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const exportToExcel = () => {
        const headers = ["Employee", "Type", "Start Date", "End Date", "Status", "Reason"];
        const rows = filteredData.map(item => ({
            "Employee": item.user.name,
            "Type": item.type,
            "Start Date": new Date(item.startDate).toLocaleDateString(),
            "End Date": new Date(item.endDate).toLocaleDateString(),
            "Status": item.status,
            "Reason": item.reason || "N/A"
        }));

        const ws = XL.utils.json_to_sheet(rows);
        const wb = XL.utils.book_new();
        XL.utils.book_append_sheet(wb, ws, "Leaves");
        XL.writeFile(wb, `Leave_Report.xlsx`);
    };

    const exportToPDF = () => {
        const doc = new jsPDF();
        doc.text(`Leave Report`, 14, 15);

        const tableData = filteredData.map(item => [
            item.user.name,
            item.type,
            new Date(item.startDate).toLocaleDateString(),
            new Date(item.endDate).toLocaleDateString(),
            item.status,
            item.reason || "—"
        ]);

        autoTable(doc, {
            head: [["Employee", "Type", "Start Date", "End Date", "Status", "Reason"]],
            body: tableData,
            startY: 20,
        });

        doc.save(`Leave_Report.pdf`);
    };

    const handleViewDetails = (user: any) => {
        // Filter data for this specific user
        const userHistory = data.filter(d => d.user.email === user.email);
        setSelectedUser(user);
        setModalData(userHistory);
        setIsModalOpen(true);
    };

    return (
        <div className="reportsContent">
            <header className="reportsHeader">
                <div>
                    <h1>Leave <span className="text-gradient">Report</span></h1>
                    <p className="subtitle">Track employee absences and leave trends.</p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="actionBtn checkInBtn ghost" onClick={exportToPDF} disabled={loading || data.length === 0} style={{ padding: '0.5rem 1rem' }}>
                        <FileText size={18} />
                        <span>PDF</span>
                    </button>
                    <button className="actionBtn checkInBtn" onClick={exportToExcel} disabled={loading || data.length === 0}>
                        <FileSpreadsheet size={18} />
                        <span>Excel</span>
                    </button>
                </div>
            </header>

            <div className="card glass" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
                <div className="filters">
                    <div className="filterGroup">
                        <label><Filter size={14} /> Filter Status</label>
                        <select value={status} onChange={(e) => setStatus(e.target.value)}>
                            <option value="">All Statuses</option>
                            <option value="PENDING">Pending</option>
                            <option value="APPROVED">Approved</option>
                            <option value="REJECTED">Rejected</option>
                        </select>
                    </div>
                    <div className="filterGroup" style={{ flex: 1 }}>
                        <label><User size={14} /> Search Employee</label>
                        <div style={{ position: 'relative' }}>
                            <Search style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} size={16} />
                            <input
                                type="text"
                                placeholder="Search by name or email..."
                                style={{ paddingLeft: '2.5rem', width: '100%' }}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
                        <Loader2 className="animate-spin" size={32} />
                    </div>
                ) : (
                    <div className="reportsTableSection">
                        <table className="dataTable">
                            <thead>
                                <tr>
                                    <th>Employee</th>
                                    <th>Type</th>
                                    <th>Start Date</th>
                                    <th>End Date</th>
                                    <th>Status</th>
                                    <th>Status</th>
                                    <th>Reason</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredData.length > 0 ? filteredData.map((item) => (
                                    <tr key={item.id}>
                                        <td>
                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                <span style={{ fontWeight: '500' }}>{item.user.name}</span>
                                                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{item.user.email}</span>
                                            </div>
                                        </td>
                                        <td>{item.type}</td>
                                        <td>{new Date(item.startDate).toLocaleDateString()}</td>
                                        <td>{new Date(item.endDate).toLocaleDateString()}</td>
                                        <td>
                                            <span className={`statusBadge status-${item.status}`}>
                                                {item.status}
                                            </span>
                                        </td>
                                        <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {item.reason || "—"}
                                        </td>
                                        <td>
                                            <button onClick={() => handleViewDetails(item.user)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--nuriek-blue)' }}>
                                                <Eye size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                                            No leave records found for this selection.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <ReportDetailModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                user={selectedUser}
                data={modalData}
                type="LEAVE"
            />
        </div >
    );
}
