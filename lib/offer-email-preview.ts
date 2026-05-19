import { buildOfferLetterEmailHtml, offerLetterEmailSubject } from "@/lib/offer-letter-email";
import { resolveOfferEmploymentType } from "@/lib/offer-letter";

export function buildOfferEmailPreviewParams(offer: {
    candidateName: string;
    position: string;
    department: string;
    refNumber: string;
    token: string;
    expiresAt: Date | null;
    employmentType?: string | null;
    internshipType?: string | null;
    internshipMonths?: number | null;
    createdBy?: { name: string | null } | null;
}) {
    const employmentType = resolveOfferEmploymentType(offer);
    const internshipType = offer.internshipType ?? null;
    const internshipMonths = offer.internshipMonths ?? null;
    const base =
        process.env.NEXTAUTH_URL ||
        process.env.NEXT_PUBLIC_APP_URL ||
        "http://localhost:3000";
    const offerUrl = `${base.replace(/\/$/, "")}/offer/${offer.token}`;

    return {
        candidateName: offer.candidateName,
        position: offer.position,
        department: offer.department,
        refNumber: offer.refNumber,
        offerUrl,
        employmentType,
        internshipType,
        internshipMonths,
        validUntil: offer.expiresAt
            ? offer.expiresAt.toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
              })
            : undefined,
    };
}

export function buildOfferEmailPreviewHtml(
    offer: Parameters<typeof buildOfferEmailPreviewParams>[0]
): string {
    return buildOfferLetterEmailHtml(buildOfferEmailPreviewParams(offer), "preview");
}
