/** Nuriek offer email — boxed layout, brand header, employment & intern variants. */

import { isInternEmploymentType } from "@/lib/offer-letter";
import {
    nuriekEmailHeaderCidSrc,
    nuriekEmailHeaderPreviewSrc,
    nuriekEmailHeaderPublicUrl,
} from "@/lib/email-header-asset";
import {
    NURIEK_EMAIL,
    nuriekEmailCta,
    nuriekEmailDocument,
    nuriekEmailHeaderRow,
    nuriekEmailHighlightBox,
} from "@/lib/nuriek-email-theme";

const C = NURIEK_EMAIL;

export type OfferLetterEmailParams = {
    candidateName: string;
    position: string;
    department: string;
    refNumber: string;
    offerUrl: string;
    validUntil?: string;
    employmentType?: string | null;
    internshipType?: string | null;
    internshipMonths?: number | null;
};

export type OfferEmailHeaderMode = "send" | "preview";

/** @deprecated Use email-header-asset helpers */
export function offerEmailHeaderImageUrl(): string {
    return nuriekEmailHeaderPublicUrl();
}

function resolveHeaderSrc(mode: OfferEmailHeaderMode = "send"): string {
    return mode === "preview" ? nuriekEmailHeaderPreviewSrc() : nuriekEmailHeaderCidSrc();
}

function validUntilBlock(validUntil?: string): string {
    if (!validUntil) return "";
    return nuriekEmailHighlightBox(
        `This offer is valid until <strong style="color: ${C.text};">${validUntil}</strong>.`
    );
}

function emailShell(
    eyebrow: string,
    headline: string,
    bodyParagraphs: string,
    validLine: string,
    params: OfferLetterEmailParams,
    ctaLabel: string,
    headerMode: OfferEmailHeaderMode = "send"
): string {
    const imageUrl = resolveHeaderSrc(headerMode);
    const bodyHtml = `
                    ${bodyParagraphs}
                    ${validLine}
                    ${nuriekEmailCta(params.offerUrl, ctaLabel)}
                    <p style="margin: 16px 0 0; font-size: 13px; color: ${C.textSoft}; line-height: 1.5;">
                      Reference: <strong style="color: ${C.text};">${params.refNumber}</strong>
                    </p>
                    <p style="margin: 18px 0 0; font-size: 13px; color: ${C.textSoft}; line-height: 1.55;">
                      Questions? Reply to this email or contact <a href="mailto:hr@nuriek.com" style="color: ${C.purpleDeep}; text-decoration: none;">hr@nuriek.com</a>.
                    </p>`;

    return nuriekEmailDocument({
        title: `${eyebrow} — ${C.brand}`,
        eyebrow,
        headline,
        bodyHtml,
        headerImageHtml: nuriekEmailHeaderRow(imageUrl),
    });
}

export function buildEmploymentOfferEmailHtml(
    params: OfferLetterEmailParams,
    headerMode: OfferEmailHeaderMode = "send"
): string {
    const firstName = params.candidateName.split(" ")[0] || params.candidateName;
    const deptLine = params.department
        ? ` in <strong style="color: ${C.purpleDeep};">${params.department}</strong>`
        : "";

    const body = `
              <p style="margin: 0 0 16px; color: ${C.textMuted}; font-size: 15px; line-height: 1.65;">
                On behalf of everyone at <strong style="color: ${C.text};">${C.footerLegal}</strong>, we are thrilled to invite you to join us as
                <strong style="color: ${C.purpleDeep};">${params.position}</strong>${deptLine}.
              </p>
              <p style="margin: 0 0 4px; color: ${C.textMuted}; font-size: 15px; line-height: 1.65;">
                Your formal offer letter is ready — please read it carefully and sign the acceptance section online. When you open the link below, you can review every page and <strong style="color: ${C.purpleDeep};">sign digitally</strong>.
              </p>`;

    return emailShell(
        "Employment offer",
        `Dear ${firstName}, we're delighted to offer you a role at ${C.brand}`,
        body,
        validUntilBlock(params.validUntil),
        params,
        "View &amp; sign your offer letter",
        headerMode
    );
}

export function buildInternOfferEmailHtml(
    params: OfferLetterEmailParams,
    headerMode: OfferEmailHeaderMode = "send"
): string {
    const firstName = params.candidateName.split(" ")[0] || params.candidateName;
    const deptLine = params.department
        ? ` with our <strong style="color: ${C.purpleDeep};">${params.department}</strong> team`
        : "";
    const months = params.internshipMonths;
    const durationNote =
        months && months > 0
            ? ` The programme duration is <strong style="color: ${C.text};">${months} month${months === 1 ? "" : "s"}</strong>.`
            : "";

    const body = `
              <p style="margin: 0 0 16px; color: ${C.textMuted}; font-size: 15px; line-height: 1.65;">
                On behalf of <strong style="color: ${C.text};">${C.footerLegal}</strong>, we are excited to offer you an internship as
                <strong style="color: ${C.purpleDeep};">${params.position}</strong>${deptLine}.${durationNote}
              </p>
              <p style="margin: 0 0 4px; color: ${C.textMuted}; font-size: 15px; line-height: 1.65;">
                Your internship offer letter includes programme details and an HR signatory section. Please open the link below to review the full letter and <strong style="color: ${C.purpleDeep};">sign your acceptance</strong> online so we can confirm your start date.
              </p>`;

    return emailShell(
        "Internship offer",
        `Dear ${firstName}, welcome to the ${C.brand} internship programme`,
        body,
        validUntilBlock(params.validUntil),
        params,
        "View &amp; sign your internship offer",
        headerMode
    );
}

export function buildOfferLetterEmailHtml(
    params: OfferLetterEmailParams,
    headerMode: OfferEmailHeaderMode = "send"
): string {
    if (isInternEmploymentType(params.employmentType)) {
        return buildInternOfferEmailHtml(params, headerMode);
    }
    return buildEmploymentOfferEmailHtml(params, headerMode);
}

export function offerLetterEmailSubject(position: string, employmentType?: string | null): string {
    if (isInternEmploymentType(employmentType)) {
        return `Your internship offer — ${position} at ${C.brand}`;
    }
    return `Your employment offer — ${position} at ${C.brand}`;
}
