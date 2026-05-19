/** Nuriek Core portal onboarding email — matches offer letter brand styling. */

import {
    nuriekEmailHeaderCidSrc,
    nuriekEmailHeaderPreviewSrc,
} from "@/lib/email-header-asset";
import type { OfferEmailHeaderMode } from "@/lib/offer-letter-email";

const C = {
    purpleDeep: "#8f7db8",
    white: "#ffffff",
    text: "#1a1917",
    textMuted: "#5c5751",
    textSoft: "#8a847c",
    border: "#e8e6e2",
    btnBg: "#3d5248",
    btnText: "#ffffff",
    credBg: "#f7f5f2",
} as const;

const BRAND = "nuriek";
const FOOTER_LEGAL = "nuriek tech pvt ltd";

export type NuriekOnboardingEmailParams = {
    recipientName: string;
    workEmail: string;
    password: string;
    loginUrl: string;
    position: string;
    department: string;
    isIntern: boolean;
    refNumber?: string;
};

function escapeHtml(s: string): string {
    return s
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

export function nuriekOnboardingEmailSubject(isIntern: boolean): string {
    return isIntern
        ? "Welcome to nuriek — your internship portal access"
        : "Welcome to nuriek core — your portal access";
}

export function buildNuriekOnboardingEmailHtml(
    params: NuriekOnboardingEmailParams,
    headerMode: OfferEmailHeaderMode = "send"
): string {
    const name = escapeHtml(params.recipientName);
    const email = escapeHtml(params.workEmail);
    const password = escapeHtml(params.password);
    const loginUrl = escapeHtml(params.loginUrl);
    const position = escapeHtml(params.position);
    const dept = escapeHtml(params.department);
    const imageUrl =
        headerMode === "preview" ? nuriekEmailHeaderPreviewSrc() : nuriekEmailHeaderCidSrc();
    const roleLine = params.isIntern
        ? "internship programme"
        : "employment with nuriek";

    const refLine = params.refNumber
        ? `<p style="margin: 0 0 16px; font-size: 13px; color: ${C.textSoft};">Offer reference: <strong style="color: ${C.text};">${escapeHtml(params.refNumber)}</strong></p>`
        : "";

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to ${BRAND} core</title>
</head>
<body style="margin: 0; padding: 0; background: ${C.white}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background: ${C.white};">
    <tr>
      <td align="center" style="padding: 0;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; background: ${C.white};">
          <tr>
            <td style="padding: 0; line-height: 0; font-size: 0;">
              <img src="${imageUrl}" width="600" alt="nuriek" style="display: block; width: 100%; max-width: 600px; height: auto; border: 0;" />
            </td>
          </tr>
          <tr>
            <td style="padding: 36px 32px 28px; background: ${C.white};">
              <p style="margin: 0 0 10px; font-size: 11px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: ${C.purpleDeep};">Nuriek Core · Onboarding</p>
              <h1 style="margin: 0 0 18px; font-family: Georgia, 'Times New Roman', Times, serif; font-size: 24px; font-weight: 500; color: ${C.text}; line-height: 1.35;">
                Welcome, ${name}
              </h1>
              <p style="margin: 0 0 14px; font-size: 15px; color: ${C.textMuted}; line-height: 1.65;">
                Your offer has been accepted — thank you. Below are your <strong style="color: ${C.text};">@nuriek.com</strong> credentials and steps to sign in to <strong style="color: ${C.text};">nuriek core</strong>, our HR portal for ${roleLine} (<em>${position}</em>, ${dept}).
              </p>
              ${refLine}
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 20px 0; background: ${C.credBg}; border: 1px solid ${C.border}; border-radius: 10px;">
                <tr>
                  <td style="padding: 20px 22px;">
                    <p style="margin: 0 0 12px; font-size: 12px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: ${C.purpleDeep};">Your sign-in details</p>
                    <p style="margin: 0 0 8px; font-size: 15px; color: ${C.text};"><strong>Work email</strong><br /><span style="font-family: ui-monospace, Menlo, monospace;">${email}</span></p>
                    <p style="margin: 0; font-size: 15px; color: ${C.text};"><strong>Password</strong><br /><span style="font-family: ui-monospace, Menlo, monospace; background: ${C.white}; padding: 4px 8px; border-radius: 4px; border: 1px solid ${C.border};">${password}</span></p>
                  </td>
                </tr>
              </table>
              <p style="margin: 0 0 12px; font-size: 14px; font-weight: 600; color: ${C.text};">What to do next</p>
              <ol style="margin: 0 0 20px; padding-left: 20px; font-size: 14px; color: ${C.textMuted}; line-height: 1.7;">
                <li>Open the portal using the button below (use a desktop browser if possible).</li>
                <li>Sign in with your <strong>@nuriek.com</strong> email and the password above.</li>
                <li>You will be asked to <strong>set a new password</strong> on first login — choose something only you know.</li>
                <li>Complete your profile, read assigned documents, and follow any onboarding checklist shown in the portal.</li>
                <li>If you use Zoho Mail, you may also sign in to mail with the same credentials — keep them confidential.</li>
              </ol>
              <table role="presentation" cellspacing="0" cellpadding="0" width="100%" style="margin: 8px 0 24px;">
                <tr>
                  <td align="center" style="border-radius: 8px; background: ${C.btnBg};">
                    <a href="${loginUrl}" style="display: block; padding: 16px 28px; font-size: 15px; font-weight: 600; color: ${C.btnText}; text-decoration: none;">Open nuriek core</a>
                  </td>
                </tr>
              </table>
              <p style="margin: 0; font-size: 13px; color: ${C.textSoft}; line-height: 1.55;">
                Portal URL: <a href="${loginUrl}" style="color: ${C.purpleDeep};">${loginUrl}</a>
              </p>
              <p style="margin: 18px 0 0; font-size: 13px; color: ${C.textSoft}; line-height: 1.55;">
                Questions? Reply to this email or contact <a href="mailto:hr@nuriek.com" style="color: ${C.purpleDeep}; text-decoration: none;">hr@nuriek.com</a>.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 24px 32px 32px; border-top: 1px solid ${C.border};">
              <p style="margin: 0; font-size: 12px; color: ${C.textSoft}; line-height: 1.6; text-align: center;">
                ${FOOTER_LEGAL} · Bangalore (HQ) · hr@nuriek.com<br />
                Confidential — do not forward your password.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
