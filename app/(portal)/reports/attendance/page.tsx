"use client";

import { useState, useEffect, useCallback } from "react";
import {
    Clock,
    Search,
    Download,
    Loader2,
    Calendar,
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

export default function AttendanceReportPage() {
    const [data, setData] = useState<{ id: string; checkIn: string; checkOut: string | null; status: string; user: { name: string; email: string; role: string } }[]>([]);
    const [loading, setLoading] = useState(true);
    const [month, setMonth] = useState(new Date().toISOString().slice(0, 7)); // Current month YYYY-MM
    const [searchTerm, setSearchTerm] = useState("");

    // Modal State
    const [selectedUser, setSelectedUser] = useState<any>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalData, setModalData] = useState<any[]>([]);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/reports/attendance?month=${month}`);
            const result = await res.json();
            if (Array.isArray(result)) {
                setData(result);
            } else {
                console.error("API returned non-array:", result);
                setData([]);
            }
        } catch (error) {
            console.error("Failed to fetch attendance report", error);
            setData([]);
        } finally {
            setLoading(false);
        }
    }, [month]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const filteredData = data.filter(item =>
        item.user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.user.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const exportToExcel = () => {
        const headers = ["Date", "Employee", "Role", "Check In", "Check Out", "Status"];
        const rows = filteredData.map(item => ({
            "Date": new Date(item.checkIn).toLocaleDateString(),
            "Employee": item.user.name,
            "Role": item.user.role,
            "Check In": new Date(item.checkIn).toLocaleTimeString(),
            "Check Out": item.checkOut ? new Date(item.checkOut).toLocaleTimeString() : "N/A",
            "Status": item.status
        }));

        const ws = XL.utils.json_to_sheet(rows);
        const wb = XL.utils.book_new();
        XL.utils.book_append_sheet(wb, ws, "Attendance");
        XL.writeFile(wb, `Attendance_Report_${month}.xlsx`);
    };

    const exportToPDF = () => {
        const doc = new jsPDF();
        doc.text(`Attendance Report - ${month}`, 14, 15);

        const tableData = filteredData.map(item => [
            new Date(item.checkIn).toLocaleDateString(),
            item.user.name,
            new Date(item.checkIn).toLocaleTimeString(),
            item.checkOut ? new Date(item.checkOut).toLocaleTimeString() : "—",
            item.status
        ]);

        autoTable(doc, {
            head: [["Date", "Employee", "Check In", "Check Out", "Status"]],
            body: tableData,
            startY: 20,
        });

        doc.save(`Attendance_Report_${month}.pdf`);
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
                    <h1>Attendance <span className="text-gradient">Report</span></h1>
                    <p className="subtitle">Detailed view of workforce punctuality and working hours.</p>
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
                        <label><Calendar size={14} /> Select Month</label>
                        <input
                            type="month"
                            value={month}
                            onChange={(e) => setMonth(e.target.value)}
                        />
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
                                    <th>Date</th>
                                    <th>Employee</th>
                                    <th>Check In</th>
                                    <th>Check Out</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredData.length > 0 ? filteredData.map((item) => (
                                    <tr key={item.id}>
                                        <td>{new Date(item.checkIn).toLocaleDateString()}</td>
                                        <td>
                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                <span style={{ fontWeight: '500' }}>{item.user.name}</span>
                                                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{item.user.email}</span>
                                            </div>
                                        </td>
                                        <td>{new Date(item.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                                        <td>{item.checkOut ? new Date(item.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "—"}</td>
                                        <td>
                                            <span className={`statusBadge status-${item.status}`}>
                                                {item.status}
                                            </span>
                                        </td>
                                        <td>
                                            <button onClick={() => handleViewDetails(item.user)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--nuriek-blue)' }}>
                                                <Eye size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                                            No attendance records found for this selection.
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
                type="ATTENDANCE"
            />
        </div >
    );
}
