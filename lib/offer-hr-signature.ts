/** HR signatory image for offer / internship letters */

export function escapeAttr(s: string): string {
    return s
        .replace(/&/g, "&amp;")
        .replace(/"/g, "&quot;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

/** Public default signature (place file at public/images/nuriek-hr-signature.png). */
export function defaultHrSignatureImageUrl(): string | null {
    const base =
        process.env.NEXTAUTH_URL ||
        process.env.NEXT_PUBLIC_APP_URL ||
        "http://localhost:3000";
    return `${base.replace(/\/$/, "")}/images/nuriek-hr-signature.png`;
}

export function resolveHrSignatureSrc(
    uploadedDataUrl?: string | null,
    useDefault = true
): string | null {
    const uploaded = uploadedDataUrl?.trim();
    if (uploaded) {
        if (uploaded.startsWith("data:image/")) return uploaded;
        if (uploaded.startsWith("http://") || uploaded.startsWith("https://") || uploaded.startsWith("/")) {
            return uploaded;
        }
    }
    if (useDefault) return defaultHrSignatureImageUrl();
    return null;
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
