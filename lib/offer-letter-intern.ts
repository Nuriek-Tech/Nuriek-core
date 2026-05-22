import {
    NURIEK_COMPANY,
    NURIEK_LEGAL_NAME,
    nuriekLetterFooter,
    nuriekLetterHeader,
    nuriekLetterStyles,
} from "@/lib/nuriek-letter-theme";
import {
    INTERNSHIP_TYPES,
    resolveInternshipMonths,
    resolveStipendAfterMonths,
    isUnpaidInternship,
    normalizeInternshipType,
} from "@/lib/internship-offer";
import { buildOfferPositionHtml, type OfferLetterInput } from "@/lib/offer-letter";
import { buildHrSignatoryBlock, resolveHrSignatureSrc } from "@/lib/offer-hr-signature";

function escapeHtml(s: string): string {
    return s
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function formatDisplayDate(isoOrDate: string): string {
    const d = new Date(isoOrDate);
    if (Number.isNaN(d.getTime())) return isoOrDate;
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function addMonthsToDate(isoOrDate: string, months: number): string {
    const d = new Date(isoOrDate);
    if (Number.isNaN(d.getTime())) return isoOrDate;
    d.setMonth(d.getMonth() + months);
    return formatDisplayDate(d.toISOString());
}

function compensationSection(
    data: OfferLetterInput,
    unpaid: boolean,
    stipendAfterMonths: number
): string {
    const stipend = escapeHtml(data.compensation?.trim() || "");
    if (unpaid) {
        const futureStipend = stipend
            ? ` Following a satisfactory <strong>${stipendAfterMonths}-month</strong> review, you may be offered a stipend of <strong>${stipend}</strong>, subject to Company policy and role requirements.`
            : ` Following a satisfactory <strong>${stipendAfterMonths}-month</strong> review, you may be considered for a paid stipend as determined by the Company, subject to performance and business needs.`;
        return `<p>
      For the initial <strong>${stipendAfterMonths} months</strong> of this internship, you will not receive monetary compensation.
      You will focus on learning and delivery during this period.${futureStipend}
      This internship is not a permanent employment contract.
    </p>`;
    }

    const amount = stipend || "as communicated by HR";
    return `<p>
      Your stipend will be <strong>${amount}</strong>, payable as per Company payroll schedule for the duration of the internship.
      This internship is on an <strong>Intern</strong> basis and is not a permanent employment contract.
    </p>`;
}

function programmeSection(unpaid: boolean, stipendAfterMonths: number): string {
    if (!unpaid) return "";

    return `
      <li class="section-item">
        <h4>2. Initial period &amp; transition to stipend</h4>
        <p>
          For the first <strong>${stipendAfterMonths} months</strong>, the internship does not include monetary compensation.
          You are expected to focus on learning, delivery, and team contribution. At the end of this period, HR and your mentor
          will conduct a performance review. Continuation of the internship and any stipend thereafter are at the Company's sole
          discretion and are not guaranteed.
        </p>
      </li>`;
}

/** Internship offer letter — paid or learning-track variants with configurable duration. */
export function buildInternOfferLetterHtml(data: OfferLetterInput): string {
    const internshipType =
        normalizeInternshipType(data.internshipType) ?? INTERNSHIP_TYPES.PAID;
    const unpaid = internshipType === INTERNSHIP_TYPES.UNPAID;
    const internshipMonths = resolveInternshipMonths(data.internshipMonths);
    const stipendAfterMonths = resolveStipendAfterMonths(
        data.stipendAfterMonths,
        Math.min(3, internshipMonths)
    );

    const issueDate = formatDisplayDate(data.issueDate);
    const joining = formatDisplayDate(data.joiningDate);
    const expectedEnd = addMonthsToDate(data.joiningDate, internshipMonths);
    const validUntil = formatDisplayDate(data.offerValidUntil);
    const city = escapeHtml(data.candidateCity || data.workLocation || "Bangalore");
    const name = escapeHtml(data.candidateName);
    const positionHtml = buildOfferPositionHtml(data);
    const department = escapeHtml(data.department);
    const reportingTo = escapeHtml(data.reportingTo);
    const workLocation = escapeHtml(data.workLocation);
    const hrName = escapeHtml(data.hrSignatory);
    const hrTitle = escapeHtml(data.hrSignatoryTitle || "Human Resources");
    const gradeLine =
        data.salaryGrade && !unpaid
            ? ` (Grade <strong>${escapeHtml(data.salaryGrade)}</strong>)`
            : "";

    const customTerms = data.additionalTerms?.trim()
        ? `<p>${escapeHtml(data.additionalTerms).replace(/\n/g, "</p><p>")}</p>`
        : "";

    const learnSectionNum = unpaid ? 3 : 2;
    const ipSectionNum = unpaid ? 4 : 3;
    const confSectionNum = unpaid ? 5 : 4;
    const termSectionNum = unpaid ? 6 : 5;
    const bgSectionNum = unpaid ? 7 : 6;
    const monthsLabel = internshipMonths === 1 ? "1 month" : `${internshipMonths} months`;
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
  <title>Internship Offer — ${name}</title>
  <style>${nuriekLetterStyles()}</style>
</head>
<body>
  <div class="page">
    <section class="sheet sheet-welcome">
    ${nuriekLetterHeader()}

    <p class="meta-row"><span>${issueDate}</span><span>Intern Ref: ${escapeHtml(data.refNumber)}</span></p>
    <p><strong>Mr./Ms. ${name}</strong><br>${city}</p>
    <p>Dear ${name.split(" ")[0] || name},</p>
    <p>
      Welcome to <strong>${NURIEK_LEGAL_NAME}</strong>. We are pleased to invite you to our internship programme
      (<strong>${monthsLabel}</strong>) and look forward to your contribution to the <strong>${department}</strong> team.
    </p>
    <p>
      Please review your internship offer letter below and sign the acceptance section online using the link sent to
      your email. We are excited to have you join us at ${workLocation}.
    </p>
    <p>Best wishes,</p>
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
    <h2 class="subject">Sub — Internship Offer Letter</h2>
    <p>Dear ${name.split(" ")[0] || name},</p>
    <p>
      We are pleased to offer you an internship with <strong>${NURIEK_LEGAL_NAME}</strong> ("Company") at our
      <strong>${workLocation}</strong> office as ${positionHtml} in the
      <strong>${department}</strong> department${gradeLine}.
    </p>
    ${compensationSection(data, unpaid, stipendAfterMonths)}

    <ol class="sections">
      <li class="section-item">
        <h4>1. Duration &amp; reporting</h4>
        <p>
          Your internship is for <strong>${monthsLabel}</strong>, commencing on <strong>${joining}</strong> with an
          expected end date of <strong>${expectedEnd}</strong> (subject to extension or early closure per Company policy).
          You will report to <strong>${reportingTo}</strong> and follow the schedule and deliverables agreed with your mentor.
          This offer remains valid until <strong>${validUntil}</strong> unless withdrawn earlier.
        </p>
      </li>
      ${programmeSection(unpaid, stipendAfterMonths)}
      <li class="section-item">
        <h4>${learnSectionNum}. Learning &amp; conduct</h4>
        <p>
          You will participate in assigned projects, code reviews, and team rituals as applicable. You must comply
          with the Company's Code of Conduct, confidentiality policies, and all rules communicated on the employee
          portal. Professional behaviour and punctuality are expected throughout the programme.
        </p>
      </li>
      <li class="section-item">
        <h4>${ipSectionNum}. Intellectual property</h4>
        <p>
          All work product, inventions, and improvements conceived during the internship relating to the Company's
          business remain the sole property of the Company. You agree to execute documents as required to protect such rights.
        </p>
      </li>
      <li class="section-item">
        <h4>${confSectionNum}. Confidentiality</h4>
        <p>
          You must not disclose confidential information, source code, client data, or internal materials during or
          after the internship except as authorised in writing.
        </p>
      </li>
      <li class="section-item">
        <h4>${termSectionNum}. Termination</h4>
        <p>
          Either party may end the internship by giving <strong>fifteen (15) days</strong> prior written notice, or
          immediately for misconduct or breach of policy. The Company may convert a successful intern to a paid
          internship or full-time role through a separate offer.
        </p>
      </li>
      <li class="section-item">
        <h4>${bgSectionNum}. Background verification</h4>
        <p>
          This offer is contingent on satisfactory background and reference checks. Inaccurate information may lead to
          withdrawal of this offer.
        </p>
        ${customTerms}
      </li>
    </ol>

    <div class="letter-closing">
    <p>Yours sincerely,</p>
    <p><strong>For ${NURIEK_LEGAL_NAME}</strong></p>
    ${hrSignatoryBlock}

    <div class="accept-block accept-block--intern">
      <h3>Acceptance (Intern)</h3>
      <p>
        I, <strong>${name}</strong>, have read and understood this internship offer for <strong>${monthsLabel}</strong>${
            unpaid
                ? `, including the initial ${stipendAfterMonths}-month period without stipend`
                : ""
        }, and agree to join on the terms stated herein and in applicable Company policies.
      </p>
      <table class="sig-table">
        <tr><td>Name</td><td><strong>${name}</strong></td></tr>
        <tr><td>Signature</td><td><span class="sig-line"></span></td></tr>
        <tr><td>Place</td><td><span class="sig-line"></span></td></tr>
        <tr><td>Date</td><td><span class="sig-line"></span></td></tr>
      </table>
      <p class="portal-signin-note">
        Sign below on this page to accept digitally. After signing, you may sign in to <strong>nuriek core</strong>
        when your portal account is provisioned.
      </p>
    </div>
    </div>

    ${nuriekLetterFooter(data.refNumber)}
    </section>
  </div>

  <button type="button" class="print-btn" onclick="window.print()">Download / Print Internship Offer</button>
</body>
</html>`;
}
