"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Loader2, Mail, Eye, X, UserCheck } from "lucide-react";

type OfferOnboardingTarget = {
    token: string;
    candidateName: string;
    candidateEmail: string | null;
    position: string;
    department: string;
    employmentType?: string | null;
    refNumber: string;
    signedName: string | null;
    provisionedUser?: { id: string; email: string | null; name: string | null; role: string } | null;
    onboardingEmailedAt?: string | null;
    onboardingWorkEmail?: string | null;
};

type Props = {
    offer: OfferOnboardingTarget;
    onClose: () => void;
    onSent: () => void;
};

export default function OfferOnboardingModal({ offer, onClose, onSent }: Props) {
    const [workEmail, setWorkEmail] = useState(
        offer.onboardingWorkEmail ||
            (offer.candidateEmail?.endsWith("@nuriek.com") ? offer.candidateEmail : "")
    );
    const [password, setPassword] = useState("");
    const [sendTo, setSendTo] = useState(offer.candidateEmail || "");
    const [previewHtml, setPreviewHtml] = useState<string | null>(null);
    const [subject, setSubject] = useState("");
    const [previewLoading, setPreviewLoading] = useState(false);
    const [sending, setSending] = useState(false);
    const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
    const previewIframeRef = useRef<HTMLIFrameElement>(null);

    const resizePreviewIframe = useCallback(() => {
        const iframe = previewIframeRef.current;
        if (!iframe) return;
        try {
            const doc = iframe.contentDocument || iframe.contentWindow?.document;
            if (!doc?.body) return;
            const height = Math.max(
                doc.documentElement.scrollHeight,
                doc.body.scrollHeight,
                480
            );
            iframe.style.height = `${height}px`;
        } catch {
            iframe.style.height = "720px";
        }
    }, []);

    const loadPreview = useCallback(async () => {
        setPreviewLoading(true);
        setMsg(null);
        try {
            const res = await fetch("/api/admin/offer-letter/onboarding-preview", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    token: offer.token,
                    workEmail,
                    password: password || "PreviewPassword1",
                }),
            });
            const data = await res.json();
            if (!res.ok) {
                setMsg({ type: "err", text: data.error || "Preview failed" });
                return;
            }
            setPreviewHtml(data.emailHtml);
            setSubject(data.subject || "");
            if (data.suggestedTo && !sendTo) setSendTo(data.suggestedTo);
            if (data.defaultWorkEmail && !workEmail) setWorkEmail(data.defaultWorkEmail);
        } catch {
            setMsg({ type: "err", text: "Could not load email preview" });
        } finally {
            setPreviewLoading(false);
        }
    }, [offer.token, workEmail, password, sendTo]);

    useEffect(() => {
        loadPreview();
    }, [loadPreview]);

    useEffect(() => {
        if (!previewHtml) return;
        const t = window.setTimeout(resizePreviewIframe, 80);
        return () => window.clearTimeout(t);
    }, [previewHtml, resizePreviewIframe]);

    const sendOnboarding = async () => {
        setSending(true);
        setMsg(null);
        try {
            const res = await fetch("/api/admin/offer-letter/onboarding-send", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    token: offer.token,
                    workEmail,
                    password,
                    sendTo,
                }),
            });
            const data = await res.json();
            if (!res.ok) {
                setMsg({ type: "err", text: data.error || "Send failed" });
                return;
            }
            onSent();
            onClose();
        } catch {
            setMsg({ type: "err", text: "Failed to send onboarding email" });
        } finally {
            setSending(false);
        }
    };

    const modal = (
        <div
            className="olOnboardBackdrop"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ol-onboard-title"
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <div className="olOnboardModal glass">
                <header className="olOnboardModalHead">
                    <h2 id="ol-onboard-title" className="olOnboardModalTitle">
                        <Mail size={18} aria-hidden />
                        Send Nuriek onboarding link
                    </h2>
                    <button type="button" className="olModalClose" onClick={onClose} aria-label="Close">
                        <X size={20} />
                    </button>
                </header>

                <div className="olOnboardModalBody">
                <p className="olOnboardLead">
                    <strong>{offer.signedName || offer.candidateName}</strong> signed offer{" "}
                    <code>{offer.refNumber}</code>. Paste Zoho credentials below, then scroll the
                    preview to review the full email.
                </p>

                {offer.provisionedUser && (
                    <p className="olOnboardHint">
                        <UserCheck size={14} />
                        Portal account exists:{" "}
                        <Link href={`/profile/${offer.provisionedUser.id}`}>
                            {offer.provisionedUser.email}
                        </Link>
                        {offer.onboardingEmailedAt && (
                            <span> · Onboarding emailed {new Date(offer.onboardingEmailedAt).toLocaleString("en-IN")}</span>
                        )}
                    </p>
                )}

                <div className="olOnboardForm olGrid2">
                    <div className="admField">
                        <label className="admLabel" htmlFor="ob-work-email">
                            Work email (@nuriek.com) *
                        </label>
                        <input
                            id="ob-work-email"
                            className="admInput"
                            type="email"
                            placeholder="firstname@nuriek.com"
                            value={workEmail}
                            onChange={(e) => setWorkEmail(e.target.value)}
                        />
                        <p className="olFieldHint">From Zoho — used to sign in to nuriek core</p>
                    </div>
                    <div className="admField">
                        <label className="admLabel" htmlFor="ob-password">
                            Password (from Zoho) *
                        </label>
                        <input
                            id="ob-password"
                            className="admInput"
                            type="text"
                            autoComplete="off"
                            placeholder="Paste Zoho mailbox password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                        <p className="olFieldHint">Embedded in the email; stored hashed in the portal</p>
                    </div>
                    <div className="admField" style={{ gridColumn: "1 / -1" }}>
                        <label className="admLabel" htmlFor="ob-send-to">
                            Send email to
                        </label>
                        <input
                            id="ob-send-to"
                            className="admInput"
                            type="email"
                            placeholder="candidate personal or work inbox"
                            value={sendTo}
                            onChange={(e) => setSendTo(e.target.value)}
                        />
                        <p className="olFieldHint">
                            Often a personal email until Zoho is active; credentials in body use @nuriek.com
                        </p>
                    </div>
                </div>

                <section className="olOnboardPreviewSection" aria-label="Email template preview">
                    <div className="olOnboardPreviewActions">
                        <p className="olEmailPreviewLabel">Email preview</p>
                        <button
                            type="button"
                            className="olBtnSecondary"
                            onClick={loadPreview}
                            disabled={previewLoading}
                        >
                            {previewLoading ? (
                                <Loader2 size={16} className="animate-spin" />
                            ) : (
                                <Eye size={16} />
                            )}
                            Refresh
                        </button>
                    </div>
                    {subject && (
                        <p className="olOnboardSubject">
                            Subject: <strong>{subject}</strong>
                        </p>
                    )}
                    <div className="olOnboardPreviewFrameWrap">
                        {previewLoading && !previewHtml ? (
                            <div className="olEmailPreviewLoading">
                                <Loader2 className="animate-spin" size={24} />
                                <span>Loading template…</span>
                            </div>
                        ) : previewHtml ? (
                            <iframe
                                ref={previewIframeRef}
                                title="Onboarding email preview"
                                srcDoc={previewHtml}
                                className="olOnboardPreviewIframe"
                                onLoad={resizePreviewIframe}
                            />
                        ) : (
                            <p className="olEmailPreviewLoading">Preview unavailable</p>
                        )}
                    </div>
                </section>

                {msg && (
                    <p className={msg.type === "ok" ? "olMsg olMsg--ok" : "olMsg olMsg--err"}>{msg.text}</p>
                )}
                </div>

                <footer className="olOnboardModalFoot">
                    <button type="button" className="olBtnSecondary" onClick={onClose}>
                        Cancel
                    </button>
                    <button
                        type="button"
                        className="admSubmitBtn"
                        disabled={sending || !workEmail || !password || !sendTo}
                        onClick={sendOnboarding}
                    >
                        {sending ? (
                            <Loader2 size={18} className="animate-spin" />
                        ) : (
                            <>
                                <Mail size={18} />
                                Send Nuriek onboarding link
                            </>
                        )}
                    </button>
                </footer>
            </div>
        </div>
    );

    if (typeof document === "undefined") return null;
    return createPortal(modal, document.body);
}
