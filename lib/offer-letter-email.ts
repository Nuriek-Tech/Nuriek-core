/** Nuriek offer email — brand header image + full white body (employment & intern variants). */

import { isInternEmploymentType } from "@/lib/offer-letter";
import {
    nuriekEmailHeaderCidSrc,
    nuriekEmailHeaderPreviewSrc,
    nuriekEmailHeaderPublicUrl,
} from "@/lib/email-header-asset";

const C = {
    purpleDeep: "#8f7db8",
    white: "#ffffff",
    text: "#1a1917",
    textMuted: "#5c5751",
    textSoft: "#8a847c",
    border: "#e8e6e2",
    btnBg: "#3d5248",
    btnText: "#ffffff",
} as const;

const BRAND = "nuriek";
const FOOTER_LEGAL = "nuriek tech pvt ltd";

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

function headerBanner(imageUrl: string): string {
    return `
          <tr>
            <td style="padding: 0; background: ${C.white}; line-height: 0; font-size: 0;">
              <a href="https://www.nuriek.com" style="text-decoration: none; display: block;">
                <img
                  src="${imageUrl}"
                  width="600"
                  alt="nuriek — technology should adapt to people"
                  style="display: block; width: 100%; max-width: 600px; height: auto; border: 0; margin: 0;"
                />
              </a>
            </td>
          </tr>`;
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

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${eyebrow} — ${BRAND}</title>
</head>
<body style="margin: 0; padding: 0; background: ${C.white}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background: ${C.white};">
    <tr>
      <td align="center" style="background: ${C.white}; padding: 0;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; background: ${C.white};">
          ${headerBanner(imageUrl)}
          <tr>
            <td style="padding: 36px 32px 32px; background: ${C.white};">
              <p style="margin: 0 0 10px; font-size: 11px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: ${C.purpleDeep};">${eyebrow}</p>
              <h1 style="margin: 0 0 18px; font-family: Georgia, 'Times New Roman', Times, serif; font-size: 24px; font-weight: 500; color: ${C.text}; line-height: 1.35;">
                ${headline}
              </h1>
              ${bodyParagraphs}
              ${validLine}
              <table role="presentation" cellspacing="0" cellpadding="0" width="100%" style="margin: 14px 0 26px;">
                <tr>
                  <td align="center" style="border-radius: 8px; background: ${C.btnBg};">
                    <a href="${params.offerUrl}" style="display: block; padding: 16px 28px; font-size: 15px; font-weight: 600; color: ${C.btnText}; text-decoration: none; text-align: center;">${ctaLabel}</a>
                  </td>
                </tr>
              </table>
              <p style="margin: 0; font-size: 13px; color: ${C.textSoft}; line-height: 1.5;">
                Reference: <strong style="color: ${C.text};">${params.refNumber}</strong>
              </p>
              <p style="margin: 18px 0 0; font-size: 13px; color: ${C.textSoft}; line-height: 1.55;">
                Questions? Reply to this email or contact <a href="mailto:hr@nuriek.com" style="color: ${C.purpleDeep}; text-decoration: none;">hr@nuriek.com</a>.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 24px 32px 32px; background: ${C.white}; border-top: 1px solid ${C.border};">
              <p style="margin: 0; font-size: 12px; color: ${C.textSoft}; line-height: 1.6; text-align: center;">
                ${FOOTER_LEGAL} · Bangalore (HQ) · hr@nuriek.com<br />
                Confidential — intended for the recipient only.
              </p>
              <p style="margin: 14px 0 0; font-size: 11px; text-align: center;">
                <a href="https://www.nuriek.com" style="color: ${C.purpleDeep}; text-decoration: none;">nuriek.com</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function validUntilBlock(validUntil?: string): string {
    if (!validUntil) return "";
    return `<p style="margin: 0 0 20px; padding: 12px 16px; background: #fafafa; border-radius: 8px; border-left: 3px solid ${C.purpleDeep}; font-size: 14px; color: ${C.textMuted}; line-height: 1.5;">
            This offer is valid until <strong style="color: ${C.text};">${validUntil}</strong>.
          </p>`;
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
                On behalf of everyone at <strong style="color: ${C.text};">${FOOTER_LEGAL}</strong>, we are thrilled to invite you to join us as
                <strong style="color: ${C.purpleDeep};">${params.position}</strong>${deptLine}.
              </p>
              <p style="margin: 0 0 16px; color: ${C.textMuted}; font-size: 15px; line-height: 1.65;">
                Your formal offer letter is ready — please read it carefully and sign the acceptance section online. When you open the link below, you can review every page and <strong style="color: ${C.purpleDeep};">sign digitally</strong>.
              </p>`;

    return emailShell(
        "Employment offer",
        `Dear ${firstName}, we're delighted to offer you a role at ${BRAND}`,
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
                On behalf of <strong style="color: ${C.text};">${FOOTER_LEGAL}</strong>, we are excited to offer you an internship as
                <strong style="color: ${C.purpleDeep};">${params.position}</strong>${deptLine}.${durationNote}
              </p>
              <p style="margin: 0 0 16px; color: ${C.textMuted}; font-size: 15px; line-height: 1.65;">
                Your internship offer letter includes programme details and an HR signatory section. Please open the link below to review the full letter and <strong style="color: ${C.purpleDeep};">sign your acceptance</strong> online so we can confirm your start date.
              </p>`;

    return emailShell(
        "Internship offer",
        `Dear ${firstName}, welcome to the ${BRAND} internship programme`,
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
        return `Your internship offer — ${position} at ${BRAND}`;
    }
    return `Your employment offer — ${position} at ${BRAND}`;
}
