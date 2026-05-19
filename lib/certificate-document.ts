import {
    nuriekLetterFooter,
    nuriekLetterHeader,
    nuriekLetterStyles,
    NURIEK_LEGAL_NAME,
} from "@/lib/nuriek-letter-theme";

export type CertificateDocInput = {
    heading: string;
    userName: string;
    bodyHtml: string;
    refLabel: string;
    issueDate: string;
    signatoryName: string;
    verifiedNote: string;
};

export function buildCertificateHtml(data: CertificateDocInput): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${data.heading} — ${data.userName}</title>
  <style>
    ${nuriekLetterStyles()}
    .cert-title {
      text-align: center;
      font-size: 14pt;
      font-weight: 700;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      margin: 20px 0 16px;
      color: #2C2C2C;
    }
    .ref-date {
      display: flex;
      justify-content: space-between;
      font-size: 10pt;
      color: #6B6560;
      margin-bottom: 20px;
    }
    .body-content { flex: 1; }
    .body-content p { margin-bottom: 12px; }
    .signature-block { margin-top: 40px; }
    .signature-line {
      width: 200px;
      border-bottom: 1px solid #3A3A3A;
      margin-bottom: 6px;
    }
    .signature-name { font-weight: 600; font-size: 10.5pt; }
    .signature-title { font-size: 9pt; color: #6B6560; }
    .verified-badge {
      margin-top: 24px;
      padding: 10px 14px;
      background: #F5F2EC;
      border: 1px solid #E5E0D8;
      font-size: 8.5pt;
      color: #6B6560;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="page">
    ${nuriekLetterHeader()}

    <h1 class="cert-title">${data.heading}</h1>

    <div class="ref-date">
      <span>${data.refLabel}</span>
      <span>Date: ${data.issueDate}</span>
    </div>

    <div class="body-content">
      <p>To Whomsoever It May Concern,</p>
      ${data.bodyHtml}
      <p>This certificate is issued in good faith and is valid as of the date mentioned above.</p>
    </div>

    <div class="signature-block">
      <div class="signature-line"></div>
      <div class="signature-name">${data.signatoryName}</div>
      <div class="signature-title">Human Resources · ${NURIEK_LEGAL_NAME}</div>
    </div>

    <div class="verified-badge">✓ ${data.verifiedNote}</div>

    ${nuriekLetterFooter(data.refLabel.replace("Ref. No: ", ""))}
  </div>

  <button type="button" class="print-btn" onclick="window.print()">Download / Print Certificate</button>
</body>
</html>`;
}
