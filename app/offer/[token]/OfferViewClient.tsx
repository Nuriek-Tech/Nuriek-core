"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import OfferSignPanel from "./OfferSignPanel";

type Props = {
    html: string;
    candidateName: string;
    token: string;
    isSigned: boolean;
    signedAt?: string | null;
    isIntern?: boolean;
};

export default function OfferViewClient({
    html: initialHtml,
    candidateName,
    token,
    isSigned: initialSigned,
    signedAt,
    isIntern = false,
}: Props) {
    const frameRef = useRef<HTMLIFrameElement>(null);
    const [displayHtml, setDisplayHtml] = useState(initialHtml);
    const signInHref = `/login?callbackUrl=${encodeURIComponent(`/offer/${token}`)}`;

    useEffect(() => {
        fetch(`/api/offer/${token}/view`, { method: "POST" }).catch(() => undefined);
    }, [token]);

    const handlePrint = () => {
        try {
            frameRef.current?.contentWindow?.print();
        } catch {
            window.print();
        }
    };

    return (
        <main className="offerViewPage">
            <div className="offerViewBar">
                <span className="offerViewBrand">nuriek</span>
                <div className="offerViewBarActions">
                    <Link href={signInHref} className="offerViewBtn offerViewBtn--ghost">
                        Sign in to Nuriek Core
                    </Link>
                    <button type="button" className="offerViewBtn offerViewBtn--primary" onClick={handlePrint}>
                        Print / Save PDF
                    </button>
                </div>
            </div>

            <div className="offerViewMain">
                <iframe
                    ref={frameRef}
                    title={`Offer letter — ${candidateName}`}
                    srcDoc={displayHtml}
                    className="offerViewFrame"
                />

                <OfferSignPanel
                    token={token}
                    candidateName={candidateName}
                    isSigned={initialSigned}
                    signedAt={signedAt}
                    isIntern={isIntern}
                    onSigned={(signedHtml) => setDisplayHtml(signedHtml)}
                />
            </div>
        </main>
    );
}
