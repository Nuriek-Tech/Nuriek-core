"use client";

import { X, Calendar, Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import "@/styles/reports.css";

interface ReportDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: {
        id: string;
        name: string;
        email: string;
        role: string;
    } | null;
    data: any; // Can be attendance or leave data
    type: "ATTENDANCE" | "LEAVE";
}

export default function ReportDetailModal({ isOpen, onClose, user, data, type }: ReportDetailModalProps) {
    if (!isOpen || !user) return null;

    return (
        <div className="modalOverlay" onClick={onClose}>
            <div className="modalContent glass" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px', width: '90%' }}>
                <div className="modalHeader">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                        <h2 style={{ fontSize: '1.25rem' }}>{user.name}</h2>
                        <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{user.email} • {user.role}</span>
                    </div>
                    <button className="closeButton" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <div className="modalBody" style={{ maxHeight: '60vh', overflowY: 'auto', padding: '1rem' }}>
                    <h3 style={{ fontSize: '1rem', marginBottom: '1rem', color: 'var(--nuriek-blue)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {type === "ATTENDANCE" ? <Clock size={18} /> : <Calendar size={18} />}
                        {type === "ATTENDANCE" ? "Attendance History" : "Leave History"}
                    </h3>

                    {data && data.length > 0 ? (
                        <div className="historyList" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {data.map((item: any, index: number) => (
                                <div key={index} style={{
                                    padding: '1rem',
                                    background: 'rgba(255,255,255,0.05)',
                                    borderRadius: '8px',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                }}>
                                    {type === "ATTENDANCE" ? (
                                        <>
                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                <span style={{ fontWeight: 500 }}>{new Date(item.checkIn).toLocaleDateString()}</span>
                                                <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>
                                                    In: {new Date(item.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <span className={`statusBadge status-${item.status}`}>{item.status}</span>
                                                {item.checkOut && (
                                                    <div style={{ fontSize: '0.8rem', opacity: 0.7, marginTop: '0.3rem' }}>
                                                        Out: {new Date(item.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </div>
                                                )}
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                <span style={{ fontWeight: 500 }}>{item.type}</span>
                                                <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>
                                                    {new Date(item.startDate).toLocaleDateString()} - {new Date(item.endDate).toLocaleDateString()}
                                                </span>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <span className={`statusBadge status-${item.status}`}>{item.status}</span>
                                            </div>
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                            No records found.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
