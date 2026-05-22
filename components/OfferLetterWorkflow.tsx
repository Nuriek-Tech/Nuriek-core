"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
    RefreshCw,
    ExternalLink,
    CheckCircle2,
    Eye,
    Mail,
    FileSignature,
    Trash2,
    AlertTriangle,
    UserPlus,
    Link2,
    XCircle,
} from "lucide-react";
import { isSuperAdminRole } from "@/lib/constants";
import { internshipTypeLabel } from "@/lib/internship-offer";
import OfferOnboardingModal from "@/components/OfferOnboardingModal";

type OfferRow = {
    id: string;
    token: string;
    refNumber: string;
    candidateName: string;
    candidateEmail: string | null;
    position: string;
    department: string;
    employmentType?: string | null;
    internshipType?: string | null;
    internshipMonths?: number | null;
    status: string;
    statusLabel: string;
    offerUrl: string;
    emailedAt: string | null;
    viewedAt: string | null;
    signedAt: string | null;
    signedName: string | null;
    declinedAt: string | null;
    declineReason: string | null;
    createdAt: string;
    provisionedUserId?: string | null;
    provisionedAt?: string | null;
    onboardingEmailedAt?: string | null;
    onboardingWorkEmail?: string | null;
    provisionedUser?: {
        id: string;
        email: string | null;
        name: string | null;
        role: string;
    } | null;
};

function fmt(iso: string | null) {
    if (!iso) return "—";
    return new Date(iso).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function statusClass(status: string) {
    switch (status) {
        case "SIGNED":
            return "olStatus olStatus--signed";
        case "DECLINED":
            return "olStatus olStatus--declined";
        case "VIEWED":
            return "olStatus olStatus--viewed";
        case "SENT":
            return "olStatus olStatus--sent";
        case "EXPIRED":
            return "olStatus olStatus--expired";
        default:
            return "olStatus";
    }
}

export default function OfferLetterWorkflow() {
    const { data: session } = useSession();
    const isSuperAdmin = isSuperAdminRole(session?.user?.role);

    const [offers, setOffers] = useState<OfferRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [deleting, setDeleting] = useState(false);
    const [purgeConfirm, setPurgeConfirm] = useState("");
    const [showPurgeAll, setShowPurgeAll] = useState(false);
    const [onboardingOffer, setOnboardingOffer] = useState<OfferRow | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/admin/offer-letter/list");
            if (res.ok) {
                const data = await res.json();
                setOffers(data.offers ?? []);
                setSelected(new Set());
            }
        } catch {
            /* ignore */
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const toggleSelect = (id: string) => {
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const toggleAll = () => {
        if (selected.size === offers.length) {
            setSelected(new Set());
        } else {
            setSelected(new Set(offers.map((o) => o.id)));
        }
    };

    const deleteSelected = async () => {
        if (selected.size === 0) return;
        if (
            !confirm(
                `Delete ${selected.size} offer(s)? This cannot be undone. Candidate links will stop working.`
            )
        ) {
            return;
        }
        setDeleting(true);
        try {
            if (isSuperAdmin && selected.size > 1) {
                const res = await fetch("/api/admin/offer-letter/purge", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ ids: [...selected] }),
                });
                if (!res.ok) {
                    const data = await res.json().catch(() => ({}));
                    alert((data as { error?: string }).error || "Delete failed");
                    return;
                }
            } else {
                for (const id of selected) {
                    const res = await fetch(`/api/admin/offer-letter/${id}`, { method: "DELETE" });
                    if (!res.ok) {
                        const data = await res.json().catch(() => ({}));
                        alert((data as { error?: string }).error || "Delete failed");
                        return;
                    }
                }
            }
            await load();
        } finally {
            setDeleting(false);
        }
    };

    const deleteOne = async (id: string, name: string) => {
        if (!confirm(`Delete offer for ${name}? This cannot be undone.`)) return;
        setDeleting(true);
        try {
            const res = await fetch(`/api/admin/offer-letter/${id}`, { method: "DELETE" });
            if (res.ok) await load();
            else {
                const data = await res.json().catch(() => ({}));
                alert((data as { error?: string }).error || "Delete failed");
            }
        } finally {
            setDeleting(false);
        }
    };

    const purgeAll = async () => {
        if (purgeConfirm !== "DELETE ALL OFFERS") {
            alert('Type exactly: DELETE ALL OFFERS');
            return;
        }
        if (!confirm("Permanently delete ALL offer letters in the database?")) return;
        setDeleting(true);
        try {
            const res = await fetch("/api/admin/offer-letter/purge", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ deleteAll: true, confirm: purgeConfirm }),
            });
            const data = await res.json().catch(() => ({}));
            if (res.ok) {
                setShowPurgeAll(false);
                setPurgeConfirm("");
                await load();
                alert(`Deleted ${(data as { deletedCount?: number }).deletedCount ?? 0} offer(s).`);
            } else {
                alert((data as { error?: string }).error || "Purge failed");
            }
        } finally {
            setDeleting(false);
        }
    };

    return (
        <section className="admPanel glass olWorkflow">
            <div className="olWorkflowHead">
                <h2 className="admPanelTitle" style={{ margin: 0 }}>
                    <span className="admPanelTitleIcon">
                        <FileSignature size={18} />
                    </span>
                    Offer workflow
                </h2>
                <div className="olWorkflowToolbar">
                    {selected.size > 0 && (
                        <button
                            type="button"
                            className="olBtnDanger"
                            disabled={deleting}
                            onClick={deleteSelected}
                        >
                            <Trash2 size={16} />
                            Delete selected ({selected.size})
                        </button>
                    )}
                    {isSuperAdmin && offers.length > 0 && (
                        <button
                            type="button"
                            className="olBtnDangerOutline"
                            disabled={deleting}
                            onClick={() => setShowPurgeAll((v) => !v)}
                        >
                            <AlertTriangle size={16} />
                            Clear all
                        </button>
                    )}
                    <button type="button" className="olBtnSecondary" onClick={load} disabled={loading}>
                        <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                        Refresh
                    </button>
                </div>
            </div>
            <p className="olWorkflowLead">
                Track sent offers, when candidates open the link, and when they sign or decline.
                Remove test rows before production.
            </p>

            {showPurgeAll && isSuperAdmin && (
                <div className="olPurgeBox">
                    <p>
                        <strong>Super Admin only:</strong> deletes every offer letter. Type{" "}
                        <code>DELETE ALL OFFERS</code> to confirm.
                    </p>
                    <div className="olPurgeRow">
                        <input
                            type="text"
                            className="admInput"
                            value={purgeConfirm}
                            onChange={(e) => setPurgeConfirm(e.target.value)}
                            placeholder="DELETE ALL OFFERS"
                        />
                        <button
                            type="button"
                            className="olBtnDanger"
                            disabled={deleting}
                            onClick={purgeAll}
                        >
                            Confirm
                        </button>
                        <button
                            type="button"
                            className="olBtnSecondary"
                            onClick={() => {
                                setShowPurgeAll(false);
                                setPurgeConfirm("");
                            }}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {loading && offers.length === 0 ? (
                <p className="olWorkflowEmpty">Loading…</p>
            ) : offers.length === 0 ? (
                <p className="olWorkflowEmpty">No offers yet. Generate one above to start.</p>
            ) : (
                <div className="olWorkflowTableWrap">
                    <table className="olWorkflowTable">
                        <thead>
                            <tr>
                                <th>
                                    <input
                                        type="checkbox"
                                        checked={selected.size === offers.length && offers.length > 0}
                                        onChange={toggleAll}
                                        aria-label="Select all"
                                    />
                                </th>
                                <th>Ref</th>
                                <th>Candidate</th>
                                <th>Role</th>
                                <th>Status</th>
                                <th>Sent</th>
                                <th>Viewed</th>
                                <th>Signed</th>
                                <th>Declined</th>
                                <th>Portal</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {offers.map((o) => (
                                <tr key={o.id}>
                                    <td>
                                        <input
                                            type="checkbox"
                                            checked={selected.has(o.id)}
                                            onChange={() => toggleSelect(o.id)}
                                            aria-label={`Select ${o.candidateName}`}
                                        />
                                    </td>
                                    <td>
                                        <code className="olRefCode">{o.refNumber}</code>
                                    </td>
                                    <td>
                                        <strong>{o.candidateName}</strong>
                                        {o.candidateEmail && (
                                            <span className="olWorkflowSub">{o.candidateEmail}</span>
                                        )}
                                    </td>
                                    <td>
                                        {o.position}
                                        <span className="olWorkflowSub">
                                            {o.department}
                                            {o.employmentType === "Intern"
                                                ? ` · ${internshipTypeLabel(o.internshipType, o.internshipMonths)}`
                                                : ""}
                                        </span>
                                    </td>
                                    <td>
                                        <span className={statusClass(o.status)}>
                                            {o.status === "SIGNED" && (
                                                <CheckCircle2 size={12} />
                                            )}
                                            {o.status === "DECLINED" && <XCircle size={12} />}
                                            {o.status === "VIEWED" && <Eye size={12} />}
                                            {o.status === "SENT" && <Mail size={12} />}
                                            {o.statusLabel}
                                        </span>
                                    </td>
                                    <td>{fmt(o.emailedAt)}</td>
                                    <td>{fmt(o.viewedAt)}</td>
                                    <td>
                                        {o.signedAt ? (
                                            <>
                                                {fmt(o.signedAt)}
                                                {o.signedName && (
                                                    <span className="olWorkflowSub">
                                                        {o.signedName}
                                                    </span>
                                                )}
                                            </>
                                        ) : (
                                            "—"
                                        )}
                                    </td>
                                    <td>
                                        {o.declinedAt ? (
                                            <>
                                                {fmt(o.declinedAt)}
                                                {o.declineReason && (
                                                    <span className="olWorkflowSub" title={o.declineReason}>
                                                        {o.declineReason.length > 48
                                                            ? `${o.declineReason.slice(0, 48)}…`
                                                            : o.declineReason}
                                                    </span>
                                                )}
                                            </>
                                        ) : (
                                            "—"
                                        )}
                                    </td>
                                    <td>
                                        {o.status === "SIGNED" ? (
                                            <div className="olPortalCol">
                                                {o.provisionedUser ? (
                                                    <Link
                                                        href={`/profile/${o.provisionedUser.id}`}
                                                        className="olWorkflowSub olPortalLink"
                                                        title="View portal profile"
                                                    >
                                                        <Link2 size={12} />
                                                        {o.provisionedUser.email || "Account"}
                                                    </Link>
                                                ) : (
                                                    <span className="olWorkflowSub">Awaiting @nuriek.com</span>
                                                )}
                                                <button
                                                    type="button"
                                                    className="olOnboardBtn"
                                                    onClick={() => setOnboardingOffer(o)}
                                                    title="Send Nuriek Core onboarding email"
                                                >
                                                    <UserPlus size={14} />
                                                    {o.onboardingEmailedAt ? "Resend onboarding" : "Send onboarding"}
                                                </button>
                                            </div>
                                        ) : (
                                            "—"
                                        )}
                                    </td>
                                    <td className="olWorkflowActions">
                                        <Link
                                            href={o.offerUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="olWorkflowLink"
                                            title="Open offer"
                                        >
                                            <ExternalLink size={16} />
                                        </Link>
                                        <button
                                            type="button"
                                            className="olWorkflowLink olWorkflowLink--danger"
                                            title="Delete offer"
                                            disabled={deleting}
                                            onClick={() => deleteOne(o.id, o.candidateName)}
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {onboardingOffer && (
                <OfferOnboardingModal
                    offer={{
                        token: onboardingOffer.token,
                        candidateName: onboardingOffer.candidateName,
                        candidateEmail: onboardingOffer.candidateEmail,
                        position: onboardingOffer.position,
                        department: onboardingOffer.department,
                        employmentType: onboardingOffer.employmentType,
                        refNumber: onboardingOffer.refNumber,
                        signedName: onboardingOffer.signedName,
                        provisionedUser: onboardingOffer.provisionedUser,
                        onboardingEmailedAt: onboardingOffer.onboardingEmailedAt,
                        onboardingWorkEmail: onboardingOffer.onboardingWorkEmail,
                    }}
                    onClose={() => setOnboardingOffer(null)}
                    onSent={() => {
                        load();
                    }}
                />
            )}
        </section>
    );
}
