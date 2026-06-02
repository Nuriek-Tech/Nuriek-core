import {
    NURIEK_COMPANY,
    NURIEK_LEGAL_NAME,
    nuriekLetterFooter,
    nuriekLetterHeader,
    nuriekLetterStyles,
} from "@/lib/nuriek-letter-theme";
import {
    INTERNSHIP_TYPES,
    DEFAULT_STIPEND_AFTER_MONTHS,
    resolveInternshipMonths,
    resolveStipendAfterMonths,
    resolveInternOfferTrack,
    resolveInternOfferCompensation,
    isMeaningfulOfferAmount,
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

/** Parse YYYY-MM-DD as local calendar date (avoids UTC day-shift). */
export function parseOfferLocalDate(isoOrDate: string): Date | null {
    const trimmed = isoOrDate.trim();
    const ymd = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
    if (ymd) {
        const d = new Date(Number(ymd[1]), Number(ymd[2]) - 1, Number(ymd[3]));
        return Number.isNaN(d.getTime()) ? null : d;
    }
    const d = new Date(trimmed);
    return Number.isNaN(d.getTime()) ? null : d;
}

function toYmd(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
}

export function formatDisplayDate(isoOrDate: string): string {
    const d = parseOfferLocalDate(isoOrDate);
    if (!d) return isoOrDate;
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function addMonthsToDate(isoOrDate: string, months: number): string {
    const d = parseOfferLocalDate(isoOrDate);
    if (!d) return isoOrDate;
    d.setMonth(d.getMonth() + months);
    return formatDisplayDate(toYmd(d));
}

export function internDurationLabels(joiningDate: string, internshipMonths: number) {
    const months = resolveInternshipMonths(internshipMonths);
    const monthsLabel = months === 1 ? "1 month" : `${months} months`;
    return {
        months,
        monthsLabel,
        joining: formatDisplayDate(joiningDate),
        expectedEnd: addMonthsToDate(joiningDate, months),
    };
}

/** Sync duration/end-date copy in stored HTML from DB metadata (fixes stale snapshots). */
export function refreshInternDurationInOfferHtml(
    html: string,
    joiningDate: string,
    internshipMonths: number
): string {
    const { months, monthsLabel, joining, expectedEnd } = internDurationLabels(
        joiningDate,
        internshipMonths
    );
    const monthsInProgramme = months === 1 ? "1 month" : `${months} months`;

    let out = html;

    out = out.replace(
        /Your internship is for <strong>[^<]*<\/strong>, commencing on <strong>[^<]*<\/strong> with an\s+expected end date of <strong>[^<]*<\/strong>/gi,
        `Your internship is for <strong>${monthsLabel}</strong>, commencing on <strong>${joining}</strong> with an expected end date of <strong>${expectedEnd}</strong>`
    );

    out = out.replace(
        /internship programme<\/strong>\s*\(<strong>[^<]*<\/strong>\)/gi,
        `internship programme</strong> (<strong>${monthsLabel}</strong>)`
    );

    out = out.replace(
        /structured learning programme for <strong>[^<]*<\/strong>/gi,
        `structured learning programme for <strong>${monthsInProgramme}</strong>`
    );

    out = out.replace(
        /<strong>internship offer<\/strong> for <strong>[^<]*<\/strong>/gi,
        `<strong>internship offer</strong> for <strong>${monthsLabel}</strong>`
    );

    return out;
}

function compensationSection(
    data: OfferLetterInput,
    track: ReturnType<typeof resolveInternOfferTrack>,
    stipendAfterMonths: number
): string {
    const includeAmount = Boolean(data.includeFuturePaymentAmount);
    const amountRaw = resolveInternOfferCompensation({
        employmentType: data.employmentType,
        internshipType: data.internshipType,
        compensation: data.compensation,
        includeFuturePaymentAmount: includeAmount,
    });
    const amount = amountRaw ? escapeHtml(amountRaw) : "";

    if (track === INTERNSHIP_TYPES.NO_MONETARY) {
        return `<div class="intern-comp-box intern-comp-box--none">
      <p><strong>Monetary compensation:</strong> None.</p>
      <p>
        This is a <strong>learning internship</strong>. You will not receive any stipend, salary, or other monetary
        compensation during the internship. Benefits are limited to learning, mentorship, and certificate of completion
        as per Company policy.
      </p>
      <p>This internship is not a permanent employment contract.</p>
    </div>`;
    }

    if (track === INTERNSHIP_TYPES.UNPAID) {
        const hasSpecificAmount =
            includeAmount && isMeaningfulOfferAmount(amountRaw);
        const futurePayment = hasSpecificAmount
            ? ` Following a satisfactory review at the end of the initial <strong>${stipendAfterMonths}-month</strong> period, you may be offered payment of <strong>${amount}</strong>, subject to Company policy, performance, and role requirements. Any such payment is not guaranteed.`
            : includeAmount
              ? ` Following a satisfactory review at the end of the initial <strong>${stipendAfterMonths}-month</strong> period, you may be offered <strong>compensation</strong>, subject to Company policy, performance, and role requirements. Any such compensation is not guaranteed and remains at the Company's sole discretion.`
              : ` Following the initial period, HR may conduct a review. Any stipend or compensation thereafter is at the Company's sole discretion, is not guaranteed, and will not be discussed as a fixed amount in this letter unless communicated separately in writing.`;

        return `<div class="intern-comp-box intern-comp-box--unpaid">
      <p><strong>Monetary compensation during initial period:</strong> None.</p>
      <p>
        For the first <strong>${stipendAfterMonths} months</strong> of this internship you will <strong>not receive any monetary compensation</strong>.
        You will focus on learning and delivery during this period.${futurePayment}
      </p>
      <p>This internship is not a permanent employment contract.</p>
    </div>`;
    }

    const stipend = amount || "as communicated by HR";
    return `<div class="intern-comp-box intern-comp-box--paid">
      <p><strong>Stipend:</strong> <strong>${stipend}</strong>, payable as per Company payroll schedule from the start of the internship.</p>
      <p>This internship is on an <strong>Intern</strong> basis and is not a permanent employment contract.</p>
    </div>`;
}

function programmeSection(
    track: ReturnType<typeof resolveInternOfferTrack>,
    stipendAfterMonths: number,
    internshipMonths: number
): string {
    if (track === INTERNSHIP_TYPES.NO_MONETARY) {
        return `
      <li class="section-item">
        <h4>2. Learning programme (non-monetary)</h4>
        <p>
          This internship is offered as a structured learning programme for <strong>${internshipMonths === 1 ? "1 month" : `${internshipMonths} months`}</strong>.
          It does not include monetary compensation at any stage unless the Company issues a separate written agreement.
          You are expected to focus on learning, delivery, and professional conduct throughout.
        </p>
      </li>`;
    }

    if (track === INTERNSHIP_TYPES.UNPAID) {
        return `
      <li class="section-item">
        <h4>2. Initial period without monetary compensation</h4>
        <p>
          For the first <strong>${stipendAfterMonths} months</strong> you will not receive stipend, salary, or other monetary compensation.
          At the end of this period, HR and your mentor will conduct a performance review. Continuation of the internship and any
          future payment remain at the Company's sole discretion and are not guaranteed.
        </p>
      </li>`;
    }

    return "";
}

/** Internship offer letter — paid, unpaid-review, or fully non-monetary variants. */
export function buildInternOfferLetterHtml(data: OfferLetterInput): string {
    const track = resolveInternOfferTrack({
        employmentType: data.employmentType,
        internshipType: data.internshipType,
        compensation: data.compensation,
        includeFuturePaymentAmount: data.includeFuturePaymentAmount,
    });
    const internshipMonths = resolveInternshipMonths(data.internshipMonths);
    const stipendAfterMonths = resolveStipendAfterMonths(
        data.stipendAfterMonths,
        Math.min(DEFAULT_STIPEND_AFTER_MONTHS, internshipMonths)
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
        data.salaryGrade && track === INTERNSHIP_TYPES.PAID
            ? ` (Grade <strong>${escapeHtml(data.salaryGrade)}</strong>)`
            : "";

    const customTerms = data.additionalTerms?.trim()
        ? `<p>${escapeHtml(data.additionalTerms).replace(/\n/g, "</p><p>")}</p>`
        : "";

    const hasExtraProgramme =
        track === INTERNSHIP_TYPES.NO_MONETARY || track === INTERNSHIP_TYPES.UNPAID;
    const learnSectionNum = hasExtraProgramme ? 3 : 2;
    const ipSectionNum = hasExtraProgramme ? 4 : 3;
    const confSectionNum = hasExtraProgramme ? 5 : 4;
    const termSectionNum = hasExtraProgramme ? 6 : 5;
    const bgSectionNum = hasExtraProgramme ? 7 : 6;
    const monthsLabel = internshipMonths === 1 ? "1 month" : `${internshipMonths} months`;

    const acceptanceExtra =
        track === INTERNSHIP_TYPES.NO_MONETARY
            ? ", including that this internship carries <strong>no monetary compensation</strong>"
            : track === INTERNSHIP_TYPES.UNPAID
              ? `, including the initial ${stipendAfterMonths}-month period with <strong>no monetary compensation</strong>`
              : "";

    const hrSignatureSrc = resolveHrSignatureSrc(data.hrSignatureDataUrl);
    const hrSignatoryBlock = buildHrSignatoryBlock({
        hrName,
        hrTitle,
        issueDate,
        hrSignatureSrc,
    });

    const internStyles = `
.intern-comp-box {
  margin: 1rem 0 1.25rem;
  padding: 1rem 1.1rem;
  border-radius: 8px;
  border: 1px solid #d8d2c8;
  background: #faf8f5;
  font-size: 10.5pt;
  line-height: 1.55;
}
.intern-comp-box--none { border-left: 4px solid #6f6a63; }
.intern-comp-box--unpaid { border-left: 4px solid #c93400; }
.intern-comp-box--paid { border-left: 4px solid #3d5248; }
.intern-comp-box p { margin: 0 0 0.65rem; }
.intern-comp-box p:last-child { margin-bottom: 0; }
`;

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Internship Offer — ${name}</title>
  <style>${nuriekLetterStyles()}${internStyles}</style>
</head>
<body>
  <div class="page">
    <section class="sheet sheet-welcome">
    ${nuriekLetterHeader()}

    <p class="meta-row"><span>${issueDate}</span><span>Intern Ref: ${escapeHtml(data.refNumber)}</span></p>
    <p><strong>Mr./Ms. ${name}</strong><br>${city}</p>
    <p>Dear ${name.split(" ")[0] || name},</p>
    <p>
      Welcome to <strong>${NURIEK_LEGAL_NAME}</strong>. We are pleased to invite you to our <strong>internship programme</strong>
      (<strong>${monthsLabel}</strong>) and look forward to your contribution to the <strong>${department}</strong> team.
    </p>
    <p>
      Please review your <strong>internship offer letter</strong> below and sign the acceptance section online using the link sent to
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
      We are pleased to offer you an <strong>internship</strong> with <strong>${NURIEK_LEGAL_NAME}</strong> ("Company") at our
      <strong>${workLocation}</strong> office as ${positionHtml} in the
      <strong>${department}</strong> department${gradeLine}.
    </p>
    ${compensationSection(data, track, stipendAfterMonths)}

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
      ${programmeSection(track, stipendAfterMonths, internshipMonths)}
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
      <h3>Acceptance (Internship)</h3>
      <p>
        I, <strong>${name}</strong>, have read and understood this <strong>internship offer</strong> for <strong>${monthsLabel}</strong>${acceptanceExtra}, and agree to join on the terms stated herein and in applicable Company policies.
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
