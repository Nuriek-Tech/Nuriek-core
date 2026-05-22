"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, PenLine, XCircle } from "lucide-react";

type Props = {
    token: string;
    candidateName: string;
    isSigned: boolean;
    isDeclined?: boolean;
    signedAt?: string | null;
    declinedAt?: string | null;
    declineReason?: string | null;
    isIntern?: boolean;
    onSigned: (signedHtml: string) => void;
};

function todayDisplay() {
    return new Date().toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    });
}

export default function OfferSignPanel({
    token,
    candidateName,
    isSigned,
    isDeclined = false,
    signedAt,
    declinedAt,
    declineReason,
    isIntern = false,
    onSigned,
}: Props) {
    const [signedName, setSignedName] = useState(candidateName);
    const [signedPlace, setSignedPlace] = useState("");
    const [signatureText, setSignatureText] = useState(candidateName);
    const [signedDate] = useState(todayDisplay());
    const [busy, setBusy] = useState(false);
    const [declineBusy, setDeclineBusy] = useState(false);
    const [error, setError] = useState("");
    const [done, setDone] = useState(isSigned);
    const [declined, setDeclined] = useState(isDeclined);
    const [showDeclineForm, setShowDeclineForm] = useState(false);
    const [declineReasonInput, setDeclineReasonInput] = useState("");
    const [recordedDeclineReason, setRecordedDeclineReason] = useState(declineReason ?? "");
    const [recordedDeclinedAt, setRecordedDeclinedAt] = useState(declinedAt ?? null);

    const handleSign = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setBusy(true);
        try {
            const res = await fetch(`/api/offer/${token}/sign`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    signedName: signedName.trim(),
                    signedPlace: signedPlace.trim(),
                    signatureText: signatureText.trim(),
                    signedDate,
                }),
            });
            const data = await res.json();
            if (!res.ok) {
                setError(data.error || "Could not save signature");
                if (data.signedHtml) {
                    onSigned(data.signedHtml);
                    setDone(true);
                }
                return;
            }
            setDone(true);
            onSigned(data.signedHtml);
        } catch {
            setError("Network error. Please try again.");
        } finally {
            setBusy(false);
        }
    };

    const handleDecline = async (e: React.FormEvent) => {
        e.preventDefault();
        if (
            !window.confirm(
                isIntern
                    ? "Decline this internship offer? HR will be notified."
                    : "Decline this offer letter? HR will be notified."
            )
        ) {
            return;
        }

        setError("");
        setDeclineBusy(true);
        try {
            const res = await fetch(`/api/offer/${token}/decline`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    declineReason: declineReasonInput.trim() || undefined,
                }),
            });
            const data = await res.json();
            if (!res.ok) {
                setError(data.error || "Could not record decline");
                if (data.declinedAt) {
                    setDeclined(true);
                    setRecordedDeclinedAt(data.declinedAt);
                    setRecordedDeclineReason(data.declineReason ?? "");
                }
                return;
            }
            setDeclined(true);
            setRecordedDeclinedAt(data.declinedAt);
            setRecordedDeclineReason(data.declineReason ?? "");
            setShowDeclineForm(false);
        } catch {
            setError("Network error. Please try again.");
        } finally {
            setDeclineBusy(false);
        }
    };

    if (declined || isDeclined) {
        return (
            <section className="offerSignPanel offerSignPanel--declined">
                <XCircle size={28} className="offerSignDeclineIcon" />
                <h2>{isIntern ? "Internship offer declined" : "Offer declined"}</h2>
                <p>
                    You have declined this offer
                    {recordedDeclinedAt
                        ? ` on ${new Date(recordedDeclinedAt).toLocaleString("en-IN")}`
                        : ""}
                    . HR has been notified.
                </p>
                {recordedDeclineReason && (
                    <p className="offerSignDeclineReason">
                        <strong>Your note:</strong> {recordedDeclineReason}
                    </p>
                )}
                <p className="offerSignDeclineHelp">
                    If this was a mistake, contact HR at{" "}
                    <a href="mailto:hr@nuriek.com">hr@nuriek.com</a>.
                </p>
            </section>
        );
    }

    if (done || isSigned) {
        return (
            <section className="offerSignPanel offerSignPanel--done">
                <CheckCircle2 size={28} className="offerSignDoneIcon" />
                <h2>{isIntern ? "Internship offer accepted" : "Offer accepted"}</h2>
                <p>
                    Thank you, <strong>{signedName || candidateName}</strong>. Your signature has
                    been recorded
                    {signedAt
                        ? ` on ${new Date(signedAt).toLocaleString("en-IN")}`
                        : ""}
                    . HR has been notified. You may print or save a copy using the button above.
                </p>
            </section>
        );
    }

    return (
        <section className="offerSignPanel">
            <header className="offerSignHead">
                <PenLine size={20} />
                <div>
                    <h2>{isIntern ? "Accept this internship offer" : "Accept this offer"}</h2>
                    <p>
                        Read the full letter above (including the HR signatory section), then sign
                        below or decline if you do not wish to proceed.
                    </p>
                </div>
            </header>

            <form className="offerSignForm" onSubmit={handleSign}>
                {error && (
                    <p className="offerSignError" role="alert">
                        {error}
                    </p>
                )}
                <div className="offerSignGrid">
                    <label>
                        Full name
                        <input
                            required
                            value={signedName}
                            onChange={(e) => {
                                setSignedName(e.target.value);
                                if (!signatureText || signatureText === candidateName) {
                                    setSignatureText(e.target.value);
                                }
                            }}
                        />
                    </label>
                    <label>
                        Place
                        <input
                            required
                            value={signedPlace}
                            onChange={(e) => setSignedPlace(e.target.value)}
                            placeholder="City"
                        />
                    </label>
                    <label>
                        Date
                        <input readOnly value={signedDate} />
                    </label>
                    <label className="offerSignSigField">
                        Signature (type your full name)
                        <input
                            required
                            value={signatureText}
                            onChange={(e) => setSignatureText(e.target.value)}
                            className="offerSignSigInput"
                            placeholder="As on official documents"
                        />
                    </label>
                </div>
                <button type="submit" className="offerSignSubmit" disabled={busy || declineBusy}>
                    {busy ? <Loader2 className="animate-spin" size={20} /> : <PenLine size={18} />}
                    {isIntern ? "I accept — sign internship offer" : "I accept — sign offer letter"}
                </button>
            </form>

            <div className="offerSignDeclineWrap">
                {!showDeclineForm ? (
                    <button
                        type="button"
                        className="offerSignDeclineToggle"
                        onClick={() => setShowDeclineForm(true)}
                        disabled={busy || declineBusy}
                    >
                        Decline this offer
                    </button>
                ) : (
                    <form className="offerSignDeclineForm" onSubmit={handleDecline}>
                        <p className="offerSignDeclineLead">
                            {isIntern
                                ? "You may optionally share a short note for HR before declining."
                                : "You may optionally share a short note for HR before declining the offer."}
                        </p>
                        <label>
                            Reason (optional)
                            <textarea
                                rows={3}
                                value={declineReasonInput}
                                onChange={(e) => setDeclineReasonInput(e.target.value)}
                                placeholder="e.g. Accepted another role"
                                maxLength={500}
                            />
                        </label>
                        <div className="offerSignDeclineActions">
                            <button
                                type="button"
                                className="offerSignDeclineCancel"
                                onClick={() => setShowDeclineForm(false)}
                                disabled={declineBusy}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="offerSignDeclineSubmit"
                                disabled={declineBusy}
                            >
                                {declineBusy ? (
                                    <Loader2 className="animate-spin" size={18} />
                                ) : (
                                    <XCircle size={18} />
                                )}
                                Confirm decline
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </section>
    );
}
