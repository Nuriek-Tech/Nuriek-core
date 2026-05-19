"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, PenLine } from "lucide-react";

type Props = {
    token: string;
    candidateName: string;
    isSigned: boolean;
    signedAt?: string | null;
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
    signedAt,
    isIntern = false,
    onSigned,
}: Props) {
    const [signedName, setSignedName] = useState(candidateName);
    const [signedPlace, setSignedPlace] = useState("");
    const [signatureText, setSignatureText] = useState(candidateName);
    const [signedDate] = useState(todayDisplay());
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const [done, setDone] = useState(isSigned);

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
                        below. This creates a digital record for Nuriek HR.
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
                <button type="submit" className="offerSignSubmit" disabled={busy}>
                    {busy ? <Loader2 className="animate-spin" size={20} /> : <PenLine size={18} />}
                    {isIntern ? "I accept — sign internship offer" : "I accept — sign offer letter"}
                </button>
            </form>
        </section>
    );
}
