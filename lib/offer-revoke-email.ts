import { isInternEmploymentType } from "@/lib/offer-letter";
import {
    nuriekEmailHeaderCidSrc,
    nuriekEmailHeaderPreviewSrc,
} from "@/lib/email-header-asset";
import { NURIEK_EMAIL, nuriekEmailDocument, nuriekEmailHeaderRow } from "@/lib/nuriek-email-theme";

const C = NURIEK_EMAIL;

export type OfferRevokeEmailParams = {
    candidateName: string;
    position: string;
    department: string;
    refNumber: string;
    employmentType?: string | null;
    revokeReason?: string | null;
    revokedByName?: string | null;
    wasSigned?: boolean;
    contactHrUrl?: string;
};

export type OfferRevokeHeaderMode = "send" | "preview";

function resolveHeaderSrc(mode: OfferRevokeHeaderMode): string {
    return mode === "preview" ? nuriekEmailHeaderPreviewSrc() : nuriekEmailHeaderCidSrc();
}

function reasonBlock(reason?: string | null): string {
    if (!reason?.trim()) return "";
    return `
      <p style="margin: 16px 0 0; padding: 12px 14px; background: ${C.innerBg}; border: 1px solid ${C.cardBorder}; border-radius: 8px; font-size: 14px; color: ${C.textMuted}; line-height: 1.55;">
        <strong style="color: ${C.text};">Note from HR:</strong> ${reason.trim()}
      </p>`;
}

export function offerRevokeCandidateSubject(
    refNumber: string,
    employmentType?: string | null
): string {
    const kind = isInternEmploymentType(employmentType) ? "Internship offer" : "Offer";
    return `${kind} withdrawn — ${refNumber}`;
}

export function offerRevokeHrSubject(refNumber: string, candidateName: string): string {
    return `Offer revoked — ${candidateName} (${refNumber})`;
}

/** Email to candidate when HR revokes an offer or internship. */
export function buildOfferRevokeCandidateEmailHtml(
    params: OfferRevokeEmailParams,
    mode: OfferRevokeHeaderMode = "send"
): string {
    const firstName = params.candidateName.split(" ")[0] || params.candidateName;
    const isIntern = isInternEmploymentType(params.employmentType);
    const kind = isIntern ? "internship offer" : "offer letter";
    const signedNote = params.wasSigned
        ? `<p style="margin: 12px 0 0; font-size: 14px; color: ${C.textMuted}; line-height: 1.6;">
             You had previously accepted this offer. HR will follow up separately if any further steps are required.
           </p>`
        : "";

    const bodyHtml = `
      <p style="margin: 0 0 16px; color: ${C.textMuted}; font-size: 15px; line-height: 1.65;">
        Dear ${firstName},
      </p>
      <p style="margin: 0 0 16px; color: ${C.textMuted}; font-size: 15px; line-height: 1.65;">
        We are writing to inform you that your <strong style="color: ${C.text};">${kind}</strong> for
        <strong style="color: ${C.purpleDeep};">${params.position}</strong>
        ${params.department ? ` (${params.department})` : ""} at <strong style="color: ${C.text};">${C.footerLegal}</strong>
        has been <strong style="color: ${C.text};">withdrawn</strong> and is no longer valid.
      </p>
      <p style="margin: 0; color: ${C.textMuted}; font-size: 15px; line-height: 1.65;">
        The online offer link will no longer accept acceptance. If you have questions, please contact our HR team.
      </p>
      ${reasonBlock(params.revokeReason)}
      ${signedNote}
      <p style="margin: 18px 0 0; font-size: 13px; color: ${C.textSoft}; line-height: 1.55;">
        Reference: <strong style="color: ${C.text};">${params.refNumber}</strong><br>
        <a href="mailto:hr@nuriek.com" style="color: ${C.purpleDeep}; text-decoration: none;">hr@nuriek.com</a>
      </p>`;

    return nuriekEmailDocument({
        title: `Offer withdrawn — ${C.brand}`,
        eyebrow: isIntern ? "Internship update" : "Offer update",
        headline: isIntern ? "Your internship offer has been withdrawn" : "Your offer has been withdrawn",
        bodyHtml,
        headerImageHtml: nuriekEmailHeaderRow(resolveHeaderSrc(mode)),
    });
}

/** Internal HR notification when an offer is revoked. */
export function buildOfferRevokeHrEmailHtml(
    params: OfferRevokeEmailParams & {
        candidateEmail?: string | null;
        previousStatus?: string;
        provisionedEmail?: string | null;
    },
    mode: OfferRevokeHeaderMode = "send"
): string {
    const isIntern = isInternEmploymentType(params.employmentType);
    const statusLine = params.previousStatus
        ? `<tr><td style="padding:6px 0;color:${C.textSoft};">Previous status</td><td style="padding:6px 0;"><strong>${params.previousStatus}</strong></td></tr>`
        : "";
    const provisionLine = params.provisionedEmail
        ? `<tr><td style="padding:6px 0;color:${C.textSoft};">Portal account</td><td style="padding:6px 0;">${params.provisionedEmail} — review access manually if needed</td></tr>`
        : "";

    const bodyHtml = `
      <p style="margin: 0 0 16px; color: ${C.textMuted}; font-size: 15px; line-height: 1.65;">
        An ${isIntern ? "internship " : ""}offer has been <strong style="color: ${C.text};">revoked</strong>
        ${params.revokedByName ? ` by <strong>${params.revokedByName}</strong>` : ""}.
      </p>
      <table role="presentation" width="100%" style="margin: 0 0 16px; font-size: 14px; color: ${C.textMuted};">
        <tr><td style="padding:6px 0;color:${C.textSoft};">Candidate</td><td style="padding:6px 0;"><strong>${params.candidateName}</strong></td></tr>
        <tr><td style="padding:6px 0;color:${C.textSoft};">Email</td><td style="padding:6px 0;">${params.candidateEmail || "—"}</td></tr>
        <tr><td style="padding:6px 0;color:${C.textSoft};">Role</td><td style="padding:6px 0;">${params.position} · ${params.department}</td></tr>
        <tr><td style="padding:6px 0;color:${C.textSoft};">Reference</td><td style="padding:6px 0;"><strong>${params.refNumber}</strong></td></tr>
        ${statusLine}
        ${provisionLine}
      </table>
      ${reasonBlock(params.revokeReason)}
      <p style="margin: 16px 0 0; font-size: 13px; color: ${C.textSoft};">
        The candidate has been notified by email when an address was on file.
      </p>`;

    return nuriekEmailDocument({
        title: `Offer revoked — ${params.refNumber}`,
        eyebrow: "HR · Offer workflow",
        headline: "Offer letter revoked",
        bodyHtml,
        headerImageHtml: nuriekEmailHeaderRow(resolveHeaderSrc(mode)),
    });
}
