"use client";

import { useState } from "react";

export default function LeaveApprovalConfirmation({ token, action, employee, type, startDate, endDate }: {
    token: string;
    action: "Approve" | "Reject";
    employee: string;
    type: string;
    startDate: string;
    endDate: string;
}) {
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const submit = async () => {
        setBusy(true);
        setError("");
        try {
            const response = await fetch(`/api/leave/respond/${encodeURIComponent(token)}`, { method: "POST" });
            if (!response.ok) throw new Error("Could not record this decision");
            window.location.assign(response.url);
        } catch {
            setError("Could not record this decision. The link may have expired. Please refresh and try again.");
            setBusy(false);
        }
    };
    return <main className="leaveRespondPage"><section className="leaveRespondCard">
        <h1>{action} leave request?</h1>
        <p>{employee} · {type} leave</p>
        <p>{startDate} – {endDate}</p>
        {error && <p role="alert">{error}</p>}
        <button type="button" onClick={submit} disabled={busy} style={{ marginTop: "1rem", padding: ".75rem 1.25rem", borderRadius: ".65rem", background: "#2563eb", color: "white", fontWeight: 600 }}>
            {busy ? "Saving…" : `Confirm ${action.toLowerCase()}`}
        </button>
    </section></main>;
}
