"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import OfferSignPanel from "./OfferSignPanel";
import OfferLetterDocument from "./OfferLetterDocument";

type Props = {
    html: string;
    candidateName: string;
    token: string;
    isSigned: boolean;
    isDeclined?: boolean;
    signedAt?: string | null;
    declinedAt?: string | null;
    declineReason?: string | null;
    isIntern?: boolean;
};

export default function OfferViewClient({
    html: initialHtml,
    candidateName,
    token,
    isSigned: initialSigned,
    isDeclined: initialDeclined = false,
    signedAt,
    declinedAt,
    declineReason,
    isIntern = false,
}: Props) {
    const [displayHtml, setDisplayHtml] = useState(initialHtml);
    const signInHref = `/login?callbackUrl=${encodeURIComponent(`/offer/${token}`)}`;

    useEffect(() => {
        fetch(`/api/offer/${token}/view`, { method: "POST" }).catch(() => undefined);
    }, [token]);

    return (
        <main className="offerViewPage">
            <div className="offerViewBar">
                <span className="offerViewBrand">nuriek</span>
                <div className="offerViewBarActions">
                    <Link href={signInHref} className="offerViewBtn offerViewBtn--ghost">
                        Sign in to Nuriek Core
                    </Link>
                    <button
                        type="button"
                        className="offerViewBtn offerViewBtn--primary"
                        onClick={() => window.print()}
                    >
                        Print / Save PDF
                    </button>
                </div>
            </div>

            <div className="offerViewMain">
                <OfferLetterDocument html={displayHtml} className="offerViewFrame" />

                <OfferSignPanel
                    token={token}
                    candidateName={candidateName}
                    isSigned={initialSigned}
                    isDeclined={initialDeclined}
                    signedAt={signedAt}
                    declinedAt={declinedAt}
                    declineReason={declineReason}
                    isIntern={isIntern}
                    onSigned={(signedHtml) => setDisplayHtml(signedHtml)}
                />
            </div>
        </main>
    );
}
