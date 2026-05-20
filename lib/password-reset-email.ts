import { nuriekEmailHeaderCidSrc } from "@/lib/email-header-asset";
import {
    NURIEK_EMAIL,
    nuriekEmailCta,
    nuriekEmailDocument,
    nuriekEmailFooterBlock,
    nuriekEmailHeaderRow,
    nuriekEmailHighlightBox,
} from "@/lib/nuriek-email-theme";

const C = NURIEK_EMAIL;

function escapeHtml(s: string): string {
    return s
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

export function passwordResetEmailSubject(): string {
    return "Reset your Nuriek Core password";
}

export function buildPasswordResetEmailHtml(params: {
    recipientName: string;
    resetUrl: string;
    expiresMinutes: number;
}): string {
    const name = escapeHtml(params.recipientName || "there");
    const resetUrl = escapeHtml(params.resetUrl);
    const mins = params.expiresMinutes;

    const bodyHtml = `
                    <p style="margin: 0 0 16px; font-size: 15px; color: ${C.textMuted}; line-height: 1.6;">
                      Hi ${name}, we received a request to reset your Nuriek Core password.
                    </p>
                    ${nuriekEmailHighlightBox(
                        `<p style="margin: 0; font-size: 14px; line-height: 1.55;">
                        This link expires in <strong>${mins} minutes</strong>. If you did not request a reset, you can ignore this email — your password will stay the same.
                      </p>`
                    )}
                    <p style="margin: 16px 0 0; font-size: 14px; color: ${C.textSoft}; line-height: 1.55;">
                      For security, the link only works once.
                    </p>`;

    const ctaHtml = nuriekEmailCta(resetUrl, "Reset password");

    return nuriekEmailDocument({
        title: passwordResetEmailSubject(),
        eyebrow: "nuriek core",
        headline: "Password reset",
        bodyHtml,
        headerImageHtml: nuriekEmailHeaderRow(nuriekEmailHeaderCidSrc()),
        ctaHtml,
        footerHtml: nuriekEmailFooterBlock(),
    });
}
