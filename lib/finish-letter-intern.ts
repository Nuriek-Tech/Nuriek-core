import {
    NURIEK_COMPANY,
    NURIEK_LEGAL_NAME,
    nuriekLetterFooter,
    nuriekLetterHeader,
    nuriekLetterStyles,
} from "@/lib/nuriek-letter-theme";

export type FinishLetterInput = {
    internName: string;
    issueDate: string;
    joiningDate: string;
    lastWorkingDate: string;
    department: string;
    position: string;
    reportingManager: string;
    hrSignatory: string;
    hrSignatoryTitle: string;
};

function escapeHtml(s: string): string {
    return s
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

export function formatDisplayDate(isoOrDate: string): string {
    const trimmed = isoOrDate.trim();
    let d: Date | null = null;
    const ymd = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
    if (ymd) {
        d = new Date(Number(ymd[1]), Number(ymd[2]) - 1, Number(ymd[3]));
    } else {
        d = new Date(trimmed);
    }
    if (!d || Number.isNaN(d.getTime())) return isoOrDate;
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function buildInternFinishLetterHtml(data: FinishLetterInput): string {
    const issueDate = formatDisplayDate(data.issueDate);
    const joiningDate = formatDisplayDate(data.joiningDate);
    const lastWorkingDate = formatDisplayDate(data.lastWorkingDate);
    const name = escapeHtml(data.internName);
    const position = escapeHtml(data.position || "Intern");
    const department = escapeHtml(data.department || "General");
    const hrName = escapeHtml(data.hrSignatory || "Human Resources");
    const hrTitle = escapeHtml(data.hrSignatoryTitle || "HR Team");

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Internship Completion Letter — ${name}</title>
  <style>${nuriekLetterStyles()}</style>
</head>
<body>
  <div class="page">
    <section class="sheet">
    ${nuriekLetterHeader()}

    <p class="meta-row"><span>Date: ${issueDate}</span></p>
    <br/>
    <h2 class="subject" style="text-align: center; font-size: 14pt; margin-bottom: 24px; text-decoration: underline;">TO WHOMSOEVER IT MAY CONCERN</h2>
    
    <p>
      This is to certify that <strong>${name}</strong> has successfully completed their internship with <strong>${NURIEK_LEGAL_NAME}</strong> 
      as a <strong>${position}</strong> in the <strong>${department}</strong> department.
    </p>
    <p>
      Their internship tenure was from <strong>${joiningDate}</strong> to <strong>${lastWorkingDate}</strong>.
    </p>
    <p>
      During this period, we found them to be sincere, hardworking, and dedicated to their assignments. 
      They have demonstrated good learning capabilities and a professional attitude towards their work.
    </p>
    <p>
      We wish them all the best in their future endeavors.
    </p>

    <div class="letter-closing" style="margin-top: 40px;">
      <p>Yours sincerely,</p>
      <p><strong>For ${NURIEK_LEGAL_NAME}</strong></p>
      <br/><br/><br/>
      <p>
        <strong>${hrName}</strong><br>
        ${hrTitle}<br>
        ${NURIEK_COMPANY}
      </p>
    </div>

    ${nuriekLetterFooter()}
    </section>
  </div>

  <button type="button" class="print-btn" onclick="window.print()">Download / Print Finish Letter</button>
</body>
</html>`;
}
