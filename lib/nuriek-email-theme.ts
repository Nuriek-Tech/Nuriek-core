/**
 * Shared Nuriek transactional email layout — boxed card on warm page background.
 * Table-based for Gmail, Outlook, and Zoho.
 */

export const NURIEK_EMAIL = {
    pageBg: "#ebe8e1",
    cardBg: "#fdfcfa",
    cardBorder: "#d8d2c8",
    cardBorderOuter: "#e5e0d8",
    innerBg: "#faf8f5",
    purpleDeep: "#8f7db8",
    purpleSoft: "#b8a9d4",
    text: "#1a1917",
    textMuted: "#5c5751",
    textSoft: "#8a847c",
    btnBg: "#3d5248",
    btnText: "#ffffff",
    footerLegal: "nuriek tech pvt ltd",
    brand: "nuriek",
    maxWidth: 600,
} as const;

export function nuriekEmailHeaderRow(imageUrl: string, linkUrl = "https://www.nuriek.com"): string {
    const C = NURIEK_EMAIL;
    return `
          <tr>
            <td style="padding: 0; margin: 0; line-height: 0; font-size: 0; border-bottom: 1px solid ${C.cardBorder};">
              <a href="${linkUrl}" style="text-decoration: none; display: block;">
                <img
                  src="${imageUrl}"
                  width="${C.maxWidth}"
                  alt="${C.brand} — technology should adapt to people"
                  style="display: block; width: 100%; max-width: ${C.maxWidth}px; height: auto; border: 0; margin: 0;"
                />
              </a>
            </td>
          </tr>`;
}

export function nuriekEmailCta(href: string, label: string): string {
    const C = NURIEK_EMAIL;
    return `
              <table role="presentation" cellspacing="0" cellpadding="0" width="100%" style="margin: 22px 0 8px;">
                <tr>
                  <td align="center" style="border-radius: 8px; background: ${C.btnBg}; border: 1px solid ${C.btnBg};">
                    <a href="${href}" style="display: block; padding: 15px 28px; font-size: 15px; font-weight: 600; color: ${C.btnText}; text-decoration: none; text-align: center; letter-spacing: 0.02em;">${label}</a>
                  </td>
                </tr>
              </table>`;
}

export function nuriekEmailInfoBox(innerHtml: string, title?: string): string {
    const C = NURIEK_EMAIL;
    const titleRow = title
        ? `<p style="margin: 0 0 14px; font-size: 11px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: ${C.purpleDeep};">${title}</p>`
        : "";
    return `
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 20px 0; border: 1px solid ${C.cardBorder}; border-radius: 10px; background: ${C.innerBg};">
                <tr>
                  <td style="padding: 20px 22px;">
                    ${titleRow}
                    ${innerHtml}
                  </td>
                </tr>
              </table>`;
}

export function nuriekEmailHighlightBox(innerHtml: string): string {
    const C = NURIEK_EMAIL;
    return `
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 0 0 20px; border: 1px solid ${C.cardBorder}; border-left: 3px solid ${C.purpleDeep}; border-radius: 8px; background: ${C.innerBg};">
                <tr>
                  <td style="padding: 14px 18px; font-size: 14px; color: ${C.textMuted}; line-height: 1.55;">
                    ${innerHtml}
                  </td>
                </tr>
              </table>`;
}

export function nuriekEmailFooterBlock(): string {
    const C = NURIEK_EMAIL;
    return `
          <tr>
            <td style="padding: 22px 32px 28px; background: ${C.cardBg}; border-top: 1px solid ${C.cardBorder};">
              <p style="margin: 0; font-size: 12px; color: ${C.textSoft}; line-height: 1.65; text-align: center;">
                ${C.footerLegal} · Bangalore (HQ) · <a href="mailto:hr@nuriek.com" style="color: ${C.purpleDeep}; text-decoration: none;">hr@nuriek.com</a><br />
                Confidential — intended for the recipient only.
              </p>
              <p style="margin: 12px 0 0; font-size: 11px; text-align: center;">
                <a href="https://www.nuriek.com" style="color: ${C.purpleDeep}; text-decoration: none; font-weight: 600;">nuriek.com</a>
              </p>
            </td>
          </tr>`;
}

export type NuriekEmailDocumentParams = {
    title: string;
    eyebrow: string;
    headline: string;
    bodyHtml: string;
    headerImageHtml: string;
    ctaHtml?: string;
    footerHtml?: string;
};

/** Full HTML email: page background + bordered card + header + body + footer. */
export function nuriekEmailDocument(params: NuriekEmailDocumentParams): string {
    const C = NURIEK_EMAIL;
    const { title, eyebrow, headline, bodyHtml, headerImageHtml, ctaHtml = "", footerHtml } = params;

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; background: ${C.pageBg}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background: ${C.pageBg};">
    <tr>
      <td align="center" style="padding: 28px 16px 36px;">
        <!-- Outer box shadow simulation -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: ${C.maxWidth}px; border: 1px solid ${C.cardBorderOuter}; border-radius: 14px; background: ${C.cardBorder};">
          <tr>
            <td style="padding: 1px; border-radius: 14px;">
              <!-- Inner card -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: ${C.maxWidth}px; background: ${C.cardBg}; border-radius: 12px; overflow: hidden;">
                ${headerImageHtml}
                <tr>
                  <td style="padding: 32px 32px 28px; background: ${C.cardBg};">
                    <p style="margin: 0 0 10px; font-size: 11px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: ${C.purpleDeep};">${eyebrow}</p>
                    <h1 style="margin: 0 0 20px; font-family: Georgia, 'Times New Roman', Times, serif; font-size: 24px; font-weight: 500; color: ${C.text}; line-height: 1.35;">
                      ${headline}
                    </h1>
                    ${bodyHtml}
                    ${ctaHtml}
                  </td>
                </tr>
                ${footerHtml ?? nuriekEmailFooterBlock()}
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/** Simple branded email (documents, timesheets) without header image. */
export function nuriekEmailSimple(params: {
    title: string;
    eyebrow: string;
    headline: string;
    bodyHtml: string;
    ctaHref?: string;
    ctaLabel?: string;
}): string {
    const ctaHtml =
        params.ctaHref && params.ctaLabel
            ? nuriekEmailCta(params.ctaHref, params.ctaLabel)
            : "";

    return nuriekEmailDocument({
        title: params.title,
        eyebrow: params.eyebrow,
        headline: params.headline,
        bodyHtml: params.bodyHtml,
        headerImageHtml: "",
        ctaHtml,
    });
}
