/** HR signatory image for offer / internship letters */

import { loadHrSignatureDataUrlFromDisk } from "@/lib/offer-hr-signature-asset";

export function escapeAttr(s: string): string {
    return s
        .replace(/&/g, "&amp;")
        .replace(/"/g, "&quot;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

export function resolveHrSignatureSrc(
    uploadedDataUrl?: string | null,
    useDefault = true
): string | null {
    const uploaded = uploadedDataUrl?.trim();
    if (uploaded) {
        if (uploaded.startsWith("data:image/")) return uploaded;
        if (
            uploaded.startsWith("http://") ||
            uploaded.startsWith("https://") ||
            uploaded.startsWith("/")
        ) {
            return uploaded;
        }
    }
    if (useDefault) return loadHrSignatureDataUrlFromDisk();
    return null;
}

/** Replace HR signatory signature row (fixes prod offers with missing /images/ URLs). */
export function patchHrSignatureInOfferHtml(html: string, sigSrc: string | null): string {
    if (!sigSrc) return html;
    const cell = sigValueCell(hrSignatureCellHtml(sigSrc));
    return html.replace(
        /(<div class="hr-sig-block accept-block">[\s\S]*?<tr><td>Signature<\/td>)<td class="sig-value">[\s\S]*?<\/td>(\s*<\/tr>)/i,
        `$1${cell}$2`
    );
}

function sigValueCell(inner: string): string {
    return `<td class="sig-value"><div class="sig-value-inner">${inner}</div></td>`;
}

export function hrSignatureCellHtml(src: string | null | undefined, alt = "HR signature"): string {
    if (!src) {
        return `<span class="sig-line hr-sig-line"></span>`;
    }
    const safe = escapeAttr(src);
    return `<img src="${safe}" alt="${escapeAttr(alt)}" class="hr-signature-img" />`;
}

export function buildHrSignatoryBlock(opts: {
    hrName: string;
    hrTitle: string;
    issueDate: string;
    hrSignatureSrc?: string | null;
}): string {
    const sigCell = hrSignatureCellHtml(opts.hrSignatureSrc, `${opts.hrName} signature`);
    return `
    <div class="hr-sig-block accept-block">
      <h3>Authorised signatory (Company)</h3>
      <table class="sig-table">
        <tr><td>Name</td>${sigValueCell(`<strong>${opts.hrName}</strong>`)}</tr>
        <tr><td>Designation</td>${sigValueCell(`<strong>${opts.hrTitle}</strong>`)}</tr>
        <tr><td>Signature</td>${sigValueCell(sigCell)}</tr>
        <tr><td>Date</td>${sigValueCell(`<strong>${opts.issueDate}</strong>`)}</tr>
      </table>
    </div>`;
}
