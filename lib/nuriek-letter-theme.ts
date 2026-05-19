/** Shared Nuriek document styling — off-white, minimal header (nuriek.com-inspired). */

export const NURIEK_COMPANY = "nuriek";
export const NURIEK_CONTACT_LINE = "Bangalore (HQ) · hr@nuriek.com";
export const NURIEK_LEGAL_NAME = "nuriek";
export const NURIEK_FOOTER_LEGAL = "nuriek tech pvt ltd";

export function nuriekLetterStyles(): string {
    return `
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Georgia', 'Times New Roman', serif;
      background: #F0EDE8;
      color: #3A3A3A;
      display: flex;
      justify-content: center;
      min-height: 100vh;
      padding: 1.5rem;
      font-size: 11pt;
      line-height: 1.55;
    }
    .page {
      background: #FDFCFA;
      width: 210mm;
      max-width: 100%;
      padding: 0;
      box-shadow: 0 2px 12px rgba(0,0,0,0.06);
    }
    .sheet {
      padding: 16mm 18mm;
      background: #FDFCFA;
    }
    .sheet-welcome {
      page-break-after: always;
      break-after: page;
    }
    .doc-header {
      border-bottom: 1px solid #E5E0D8;
      padding-bottom: 10px;
      margin-bottom: 20px;
    }
    .doc-header .company {
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      font-size: 13pt;
      font-weight: 600;
      color: #2C2C2C;
      letter-spacing: 0.06em;
      text-transform: lowercase;
    }
    .doc-header .contact {
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      font-size: 9pt;
      color: #6B6560;
      margin-top: 4px;
    }
    .doc-footer {
      margin-top: 28px;
      padding-top: 12px;
      border-top: 1px solid #E5E0D8;
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      font-size: 8pt;
      color: #8A8580;
      text-align: center;
    }
    h2.subject {
      font-size: 11pt;
      font-weight: 700;
      margin: 16px 0 12px;
      text-decoration: underline;
    }
    p { margin-bottom: 8px; text-align: justify; orphans: 3; widows: 3; }
    strong { color: #2C2C2C; }
    ol.sections {
      margin: 6px 0 6px 0;
      padding: 0;
      list-style: none;
      counter-reset: section;
    }
    ol.sections > li.section-item {
      margin-bottom: 8px;
      padding: 0 0 6px 0;
      page-break-inside: avoid;
      break-inside: avoid-page;
      -webkit-column-break-inside: avoid;
    }
    ol.sections > li.section-item h4 {
      font-size: 10.5pt;
      font-weight: 700;
      margin-bottom: 3px;
      text-transform: uppercase;
      page-break-after: avoid;
      break-after: avoid-page;
    }
    ol.sections > li.section-item p {
      margin-bottom: 0;
    }
    .letter-closing {
      margin-top: 14px;
      page-break-inside: avoid;
      break-inside: avoid-page;
    }
    .meta-row {
      display: flex;
      justify-content: space-between;
      font-size: 10pt;
      margin-bottom: 16px;
      color: #5C5C5C;
    }
    .accept-block {
      margin-top: 16px;
      padding: 12px 14px;
      border: 1px solid #E5E0D8;
      background: #FAF8F5;
      page-break-inside: avoid;
      break-inside: avoid-page;
    }
    .accept-block h3 { font-size: 10.5pt; margin-bottom: 10px; }
    .hr-sig-block {
      margin-top: 14px;
      padding-top: 10px;
      border-top: 1px dashed #D8D2C8;
    }
    .hr-sig-line { min-width: 200px; }
    .hr-signature-img {
      display: block;
      max-height: 44px;
      max-width: 200px;
      width: auto;
      height: auto;
      object-fit: contain;
      object-position: left center;
      vertical-align: middle;
    }
    .accept-block--intern { margin-top: 18px; }
    .portal-signin-note {
      margin-top: 12px;
      font-size: 9.5pt;
      color: #5C5C5C;
      font-style: italic;
    }
    .sig-table { width: 100%; margin-top: 12px; font-size: 10pt; border-collapse: collapse; }
    .sig-table td {
      padding: 8px 12px 8px 0;
      vertical-align: middle;
    }
    .sig-table td:first-child {
      width: 100px;
      color: #5C5C5C;
      white-space: nowrap;
    }
    .sig-table td.sig-value {
      vertical-align: middle;
    }
    .sig-value-inner {
      min-height: 28px;
      display: flex;
      align-items: center;
    }
    .sig-line {
      display: inline-block;
      min-width: 180px;
      border-bottom: 1px solid #3A3A3A;
      height: 20px;
    }
    .doc-header-compact {
      border-bottom: 1px solid #E5E0D8;
      padding-top: 8px;
      padding-bottom: 14px;
      margin-bottom: 22px;
    }
    .doc-header-compact .company { font-size: 17pt; }
    .doc-header-compact .contact { font-size: 8pt; margin-top: 6px; }
    .print-btn {
      position: fixed;
      bottom: 20px;
      right: 20px;
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      background: #2C2C2C;
      color: #FDFCFA;
      border: none;
      border-radius: 4px;
      padding: 10px 20px;
      font-size: 10pt;
      cursor: pointer;
    }
    @media print {
      @page { size: A4 portrait; margin: 12mm 14mm; }
      body { background: #FDFCFA; padding: 0; font-size: 10.5pt; }
      .print-btn { display: none; }
      .page { box-shadow: none; width: 100%; max-width: none; }
      .sheet { padding: 0; }
      .sheet-welcome { page-break-after: always; break-after: page; }
      .doc-header { margin-bottom: 12px; padding-bottom: 8px; }
      h2.subject { margin: 10px 0 8px; }
      ol.sections > li.section-item {
        page-break-inside: avoid !important;
        break-inside: avoid-page !important;
      }
      .letter-closing, .accept-block {
        page-break-inside: avoid !important;
        break-inside: avoid-page !important;
      }
    }
  `;
}

export function nuriekLetterHeader(compact = false): string {
    const cls = compact ? "doc-header doc-header-compact" : "doc-header";
    return `
    <header class="${cls}">
      <div class="company">${NURIEK_COMPANY}</div>
    </header>`;
}

export function nuriekLetterFooter(ref?: string): string {
    const refLine = ref ? ` · Ref: ${ref}` : "";
    return `
    <footer class="doc-footer">
      ${NURIEK_FOOTER_LEGAL} · ${NURIEK_CONTACT_LINE}${refLine}
    </footer>`;
}
