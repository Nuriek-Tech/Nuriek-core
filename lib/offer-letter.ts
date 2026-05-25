import { randomBytes } from "crypto";
import {
    NURIEK_COMPANY,
    NURIEK_LEGAL_NAME,
    nuriekLetterFooter,
    nuriekLetterHeader,
    nuriekLetterStyles,
} from "@/lib/nuriek-letter-theme";
import { buildInternOfferLetterHtml } from "@/lib/offer-letter-intern";
import { buildHrSignatoryBlock, resolveHrSignatureSrc } from "@/lib/offer-hr-signature";

export type OfferLetterInput = {
    candidateName: string;
    candidateEmail?: string;
    candidateAddress?: string;
    candidateCity?: string;
    position: string;
    department: string;
    employmentType: string;
    /** paid | unpaid — only when employmentType is Intern */
    internshipType?: string | null;
    /** Total internship length in months */
    internshipMonths?: number;
    /** Months before stipend review (unpaid track only) */
    stipendAfterMonths?: number;
    compensation: string;
    salaryGrade?: string;
    bonusNote?: string;
    joiningDate: string;
    reportingTo: string;
    workLocation: string;
    probationMonths: number;
    offerValidUntil: string;
    hrSignatory: string;
    hrSignatoryTitle?: string;
    /** PNG/JPG as data URL, or URL path — embedded on HR signatory line */
    hrSignatureDataUrl?: string | null;
    additionalTerms?: string;
    /** When true, customRoleDesignation is shown in the offer body instead of the selected position */
    appendCustomRoleDesignation?: boolean;
    customRoleDesignation?: string;
    refNumber: string;
    issueDate: string;
};

function formatDisplayDate(isoOrDate: string): string {
    const d = new Date(isoOrDate);
    if (Number.isNaN(d.getTime())) return isoOrDate;
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatLongDate(isoOrDate: string): string {
    const d = new Date(isoOrDate);
    if (Number.isNaN(d.getTime())) return isoOrDate;
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
}

export function buildOfferLetterRef(): string {
    const stamp = Date.now().toString(36).toUpperCase();
    return `NRK-OFR-${stamp}`;
}

export function buildOfferLetterToken(): string {
    return randomBytes(24).toString("base64url");
}

export function offerLetterViewPath(token: string): string {
    return `/offer/${token}`;
}

function escapeHtml(s: string): string {
    return s
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

export function isInternEmploymentType(employmentType?: string | null): boolean {
    return employmentType?.trim().toLowerCase() === "intern";
}

/** Resolve employment type for legacy rows (no column) from position title. */
export function resolveOfferEmploymentType(offer: {
    employmentType?: string | null;
    position?: string | null;
}): string {
    if (offer.employmentType?.trim()) return offer.employmentType.trim();
    if (offer.position?.toLowerCase().includes("intern")) return "Intern";
    return "Full-time";
}

/** Position line in offer body — custom designation replaces the catalog position when enabled. */
export function buildOfferPositionHtml(data: OfferLetterInput): string {
    if (data.appendCustomRoleDesignation && data.customRoleDesignation?.trim()) {
        return `<strong>${escapeHtml(data.customRoleDesignation.trim())}</strong>`;
    }
    return `<strong>${escapeHtml(data.position)}</strong>`;
}

export function buildOfferLetterHtml(data: OfferLetterInput): string {
    if (isInternEmploymentType(data.employmentType)) {
        return buildInternOfferLetterHtml(data);
    }
    const issueDate = formatDisplayDate(data.issueDate);
    const joining = formatDisplayDate(data.joiningDate);
    const validUntil = formatDisplayDate(data.offerValidUntil);
    const city = escapeHtml(data.candidateCity || data.workLocation || "Bangalore");
    const name = escapeHtml(data.candidateName);
    const positionHtml = buildOfferPositionHtml(data);
    const department = escapeHtml(data.department);
    const compensation = escapeHtml(data.compensation);
    const employmentType = escapeHtml(data.employmentType);
    const reportingTo = escapeHtml(data.reportingTo);
    const workLocation = escapeHtml(data.workLocation);
    const hrName = escapeHtml(data.hrSignatory);
    const hrTitle = escapeHtml(data.hrSignatoryTitle || "Human Resources");
    const gradeLine = data.salaryGrade
        ? ` in Salary Grade <strong>${escapeHtml(data.salaryGrade)}</strong>`
        : "";
    const bonusLine = data.bonusNote
        ? ` (${escapeHtml(data.bonusNote)})`
        : "";

    const addressBlock = data.candidateAddress
        ? `<p>${escapeHtml(data.candidateAddress).replace(/\n/g, "<br>")}</p>`
        : "";

    const customTerms = data.additionalTerms?.trim()
        ? `<p>${escapeHtml(data.additionalTerms).replace(/\n/g, "</p><p>")}</p>`
        : "";

    const hrSignatureSrc = resolveHrSignatureSrc(data.hrSignatureDataUrl);
    const hrSignatoryBlock = buildHrSignatoryBlock({
        hrName,
        hrTitle,
        issueDate,
        hrSignatureSrc,
    });

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Employment Offer — ${name}</title>
  <style>${nuriekLetterStyles()}</style>
</head>
<body>
  <div class="page">
    <section class="sheet sheet-welcome">
    ${nuriekLetterHeader()}

    <p class="meta-row"><span>${issueDate}</span><span>Candidate Ref: ${escapeHtml(data.refNumber)}</span></p>
    <p><strong>Mr./Ms. ${name}</strong><br>${city}</p>
    <p>Dear ${name.split(" ")[0] || name},</p>
    <p>
      I would like to personally welcome you to <strong>${NURIEK_LEGAL_NAME}</strong> and am confident that you will build a
      long and mutually rewarding career with us. We believe that individuals like you, together with our existing team,
      help us build a respected, successful, and expertise-led organisation.
    </p>
    <p>
      Enclosed please find your employment offer and relevant details for your review and acceptance. We look forward to
      seeing you at ${workLocation}.
    </p>
    <p>Thanks and regards,</p>
    <p>
      <strong>${hrName}</strong><br>
      ${hrTitle}<br>
      ${NURIEK_COMPANY}
    </p>
    </section>

    <section class="sheet sheet-offer">
    ${nuriekLetterHeader(true)}

    <p class="meta-row"><span>${issueDate}</span></p>
    <p><strong>To</strong><br>Mr./Ms. <strong>${name}</strong><br>${city}</p>
    <h2 class="subject">Sub — Employment Offer Letter</h2>
    <p>Dear ${name.split(" ")[0] || name},</p>
    <p>
      We are pleased to make an offer to you to join <strong>${NURIEK_LEGAL_NAME}</strong> ("Company / Employer / We"),
      at our <strong>${workLocation}</strong> office as ${positionHtml} in the
      <strong>${department}</strong> department${gradeLine}, on a <strong>${employmentType}</strong> basis.
    </p>
    <p>
      Your total cost to Company will be <strong>${compensation}</strong>${bonusLine} at the commencement of your service.
      Details of the compensation structure will be shared upon joining.
    </p>

    <ol class="sections">
      <li class="section-item">
        <h4>1. Terms &amp; Conditions</h4>
        <p>
          This employment offer contains the broad terms and conditions governing your employment. You are bound by the
          Company's policies, rules, regulations and Code of Conduct communicated from time to time, including those on the
          employee portal. Your employment is on a whole-time basis unless otherwise agreed in writing. Compensation details
          are confidential.
        </p>
      </li>
      <li class="section-item">
        <h4>2. Transfer</h4>
        <p>
          You may be transferred at the Company's discretion to any office, branch, subsidiary, affiliate, or client location
          in India or abroad, as business needs require. You will abide by applicable Company and client policies at such locations.
        </p>
      </li>
      <li class="section-item">
        <h4>3. Retirement</h4>
        <p>
          Subject to fitness, compliance with policies, and satisfactory performance, you shall retire on the last day of the
          month of your sixtieth birthday unless an earlier date is mutually agreed or required by applicable law.
        </p>
      </li>
      <li class="section-item">
        <h4>4. Intellectual Property</h4>
        <p>
          All work product, inventions, and improvements conceived during employment relating to the Company's business shall
          remain the sole property of the Company. You shall execute documents as required to protect such rights.
        </p>
      </li>
      <li class="section-item">
        <h4>5. Code of Conduct</h4>
        <p>
          Abiding by the Company's Code of Conduct and policies is an essential condition of employment. Breach may result in
          disciplinary action, including termination without notice or compensation, as permitted by law.
        </p>
      </li>
      <li class="section-item">
        <h4>6. Termination</h4>
        <p>
          Either party may terminate employment by giving the other party <strong>three (3) months</strong> prior written notice,
          or salary in lieu thereof at the Company's discretion where applicable. Termination for cause may be immediate without
          notice pay where permitted by law and policy.
        </p>
      </li>
      <li class="section-item">
        <h4>7. Tax &amp; Background Verification</h4>
        <p>
          You are responsible for personal income tax declarations and compliance. Employment is contingent upon satisfactory
          background and reference verification. Inaccurate information may lead to withdrawal of this offer or termination.
        </p>
      </li>
      <li class="section-item">
        <h4>8. Validity, Joining &amp; Acceptance</h4>
        <p>
          Your appointment will be effective on <strong>${joining}</strong>. This offer remains valid until
          <strong>${validUntil}</strong> unless withdrawn earlier. Probation shall be
          <strong> ${data.probationMonths} month(s)</strong> from the date of joining.
        </p>
        ${customTerms}
      </li>
    </ol>

    <div class="letter-closing">
    <p>Yours sincerely,</p>
    <p><strong>For ${NURIEK_LEGAL_NAME}</strong></p>
    ${hrSignatoryBlock}

    <div class="accept-block">
      <h3>Acceptance</h3>
      <p>
        I, <strong>${name}</strong>, have read and understood the above employment offer and agree to accept employment on the
        terms and conditions stated herein and in Company policies applicable to me.
      </p>
      <table class="sig-table">
        <tr><td>Name</td><td><strong>${name}</strong></td></tr>
        <tr><td>Signature</td><td><span class="sig-line"></span></td></tr>
        <tr><td>Place</td><td><span class="sig-line"></span></td></tr>
        <tr><td>Date</td><td><span class="sig-line"></span></td></tr>
      </table>
      <p class="portal-signin-note">
        After accepting, sign in to <strong>nuriek core</strong> with your @nuriek.com account to complete onboarding and access HR documents.
      </p>
    </div>
    </div>

    ${nuriekLetterFooter(data.refNumber)}
    </section>
  </div>

  <button type="button" class="print-btn" onclick="window.print()">Download / Print Offer Letter</button>
</body>
</html>`;
}
