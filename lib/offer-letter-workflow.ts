/** Offer letter workflow statuses */
export const OFFER_STATUS = {
    GENERATED: "GENERATED",
    SENT: "SENT",
    VIEWED: "VIEWED",
    SIGNED: "SIGNED",
    DECLINED: "DECLINED",
    REVOKED: "REVOKED",
    EXPIRED: "EXPIRED",
} as const;

export type OfferStatus = (typeof OFFER_STATUS)[keyof typeof OFFER_STATUS];

export type OfferSignatureInput = {
    signedName: string;
    signedPlace: string;
    signedDate: string;
    signatureText: string;
};

export function escapeOfferHtml(s: string): string {
    return s
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

/** Inject candidate signature into the acceptance block of offer HTML */
export function applyOfferSignature(html: string, sig: OfferSignatureInput): string {
    const name = escapeOfferHtml(sig.signedName);
    const place = escapeOfferHtml(sig.signedPlace);
    const date = escapeOfferHtml(sig.signedDate);
    const signature = escapeOfferHtml(sig.signatureText);

    let out = html;

    out = out.replace(
        /<tr><td>Name<\/td><td><strong>[^<]*<\/strong><\/td><\/tr>/i,
        `<tr><td>Name</td><td><strong>${name}</strong></td></tr>`
    );

    out = out.replace(
        /<tr><td>Signature<\/td><td>[\s\S]*?<\/td><\/tr>/i,
        `<tr><td>Signature</td><td><strong class="sig-accepted" style="font-family: Georgia, 'Times New Roman', serif; font-size: 14pt; font-style: italic;">${signature}</strong></td></tr>`
    );

    out = out.replace(
        /<tr><td>Place<\/td><td>[\s\S]*?<\/td><\/tr>/i,
        `<tr><td>Place</td><td><strong>${place}</strong></td></tr>`
    );

    out = out.replace(
        /<tr><td>Date<\/td><td>[\s\S]*?<\/td><\/tr>/i,
        `<tr><td>Date</td><td><strong>${date}</strong></td></tr>`
    );

    const signedBanner = `
    <p class="offer-signed-badge" style="margin-top:12px;padding:10px 14px;background:#e8f5e9;border:1px solid #a5d6a7;border-radius:8px;font-size:10pt;color:#2e7d32;">
      ✓ Digitally accepted on ${date}
    </p>`;

    if (!out.includes("offer-signed-badge")) {
        out = out.replace(/(<\/table>\s*)(<p class="portal-signin-note")/i, `$1${signedBanner}$2`);
        if (!out.includes("offer-signed-badge")) {
            out = out.replace(/(<\/table>)/i, `$1${signedBanner}`);
        }
    }

    return out;
}

export function getOfferDisplayHtml(offer: {
    html: string;
    signedHtml?: string | null;
    status?: string | null;
}): string {
    if (offer.status === OFFER_STATUS.SIGNED && offer.signedHtml) {
        return offer.signedHtml;
    }
    return offer.html;
}

/** Apply org HR signature to stored HTML (fixes broken prod image URLs). */
export async function getOfferDisplayHtmlHydrated(offer: {
    html: string;
    signedHtml?: string | null;
    status?: string | null;
    employmentType?: string | null;
    position?: string | null;
    internshipMonths?: number | null;
    joiningDate?: Date | null;
}): Promise<string> {
    const { patchHrSignatureInOfferHtml } = await import("@/lib/offer-hr-signature");
    const { resolveHrSignatureForOffer } = await import("@/lib/offer-hr-signature-org");
    const { resolveOfferEmploymentType } = await import("@/lib/offer-letter");
    const { refreshInternDurationInOfferHtml } = await import("@/lib/offer-letter-intern");

    let base = getOfferDisplayHtml(offer);

    const employmentType = resolveOfferEmploymentType(offer);
    const isSigned = offer.status === OFFER_STATUS.SIGNED;
    if (
        !isSigned &&
        employmentType.toLowerCase() === "intern" &&
        offer.joiningDate &&
        offer.internshipMonths &&
        offer.internshipMonths > 0
    ) {
        const joiningIso = offer.joiningDate.toISOString().slice(0, 10);
        base = refreshInternDurationInOfferHtml(base, joiningIso, offer.internshipMonths);
    }

    const sigSrc = await resolveHrSignatureForOffer(null);
    return patchHrSignatureInOfferHtml(base, sigSrc);
}

export function offerStatusLabel(status: string): string {
    switch (status) {
        case OFFER_STATUS.SENT:
            return "Sent";
        case OFFER_STATUS.VIEWED:
            return "Viewed";
        case OFFER_STATUS.SIGNED:
            return "Signed";
        case OFFER_STATUS.DECLINED:
            return "Declined";
        case OFFER_STATUS.REVOKED:
            return "Revoked";
        case OFFER_STATUS.EXPIRED:
            return "Expired";
        default:
            return "Generated";
    }
}

export function computeOfferStatus(offer: {
    status: string;
    expiresAt: Date | null;
    signedAt: Date | null;
    declinedAt?: Date | null;
    revokedAt?: Date | null;
    viewedAt: Date | null;
    emailedAt: Date | null;
}): OfferStatus {
    if (offer.revokedAt || offer.status === OFFER_STATUS.REVOKED) {
        return OFFER_STATUS.REVOKED;
    }
    if (offer.declinedAt || offer.status === OFFER_STATUS.DECLINED) {
        return OFFER_STATUS.DECLINED;
    }
    if (offer.expiresAt && offer.expiresAt < new Date() && offer.status !== OFFER_STATUS.SIGNED) {
        return OFFER_STATUS.EXPIRED;
    }
    if (offer.signedAt) return OFFER_STATUS.SIGNED;
    if (offer.viewedAt) return OFFER_STATUS.VIEWED;
    if (offer.emailedAt) return OFFER_STATUS.SENT;
    return (offer.status as OfferStatus) || OFFER_STATUS.GENERATED;
}
