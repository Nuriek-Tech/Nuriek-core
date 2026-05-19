/** Nuriek Core portal onboarding email — boxed brand layout. */

import {
    nuriekEmailHeaderCidSrc,
    nuriekEmailHeaderPreviewSrc,
} from "@/lib/email-header-asset";
import type { OfferEmailHeaderMode } from "@/lib/offer-letter-email";
import {
    NURIEK_EMAIL,
    nuriekEmailCta,
    nuriekEmailDocument,
    nuriekEmailHeaderRow,
    nuriekEmailInfoBox,
} from "@/lib/nuriek-email-theme";

const C = NURIEK_EMAIL;

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

    const credBox = nuriekEmailInfoBox(
        `
                    <p style="margin: 0 0 10px; font-size: 15px; color: ${C.text}; line-height: 1.5;"><strong>Work email</strong><br /><span style="font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 14px;">${email}</span></p>
                    <p style="margin: 0; font-size: 15px; color: ${C.text}; line-height: 1.5;"><strong>Password</strong><br /><span style="font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 14px; display: inline-block; margin-top: 4px; background: ${C.cardBg}; padding: 6px 10px; border-radius: 6px; border: 1px solid ${C.cardBorder};">${password}</span></p>`,
        "Your sign-in details"
    );

    const bodyHtml = `
                    <p style="margin: 0 0 14px; font-size: 15px; color: ${C.textMuted}; line-height: 1.65;">
                      Your offer has been accepted — thank you. Below are your <strong style="color: ${C.text};">@nuriek.com</strong> credentials and steps to sign in to <strong style="color: ${C.text};">nuriek core</strong>, our HR portal for ${roleLine} (<em>${position}</em>, ${dept}).
                    </p>
                    ${refLine}
                    ${credBox}
                    <p style="margin: 0 0 10px; font-size: 14px; font-weight: 600; color: ${C.text};">What to do next</p>
                    <ol style="margin: 0 0 8px; padding-left: 20px; font-size: 14px; color: ${C.textMuted}; line-height: 1.7;">
                      <li>Open the portal using the button below (desktop browser recommended).</li>
                      <li>Sign in with your <strong>@nuriek.com</strong> email and the password above.</li>
                      <li>Set a <strong>new password</strong> on first login.</li>
                      <li>Complete your profile and read assigned documents in the portal.</li>
                      <li>If you use Zoho Mail, you may use the same credentials — keep them confidential.</li>
                    </ol>
                    ${nuriekEmailCta(loginUrl, "Open nuriek core")}
                    <p style="margin: 8px 0 0; font-size: 13px; color: ${C.textSoft}; line-height: 1.55;">
                      Portal URL: <a href="${loginUrl}" style="color: ${C.purpleDeep}; word-break: break-all;">${loginUrl}</a>
                    </p>
                    <p style="margin: 18px 0 0; font-size: 13px; color: ${C.textSoft}; line-height: 1.55;">
                      Questions? Reply to this email or contact <a href="mailto:hr@nuriek.com" style="color: ${C.purpleDeep}; text-decoration: none;">hr@nuriek.com</a>.
                    </p>`;

    const footerHtml = `
          <tr>
            <td style="padding: 22px 32px 28px; background: ${C.cardBg}; border-top: 1px solid ${C.cardBorder};">
              <p style="margin: 0; font-size: 12px; color: ${C.textSoft}; line-height: 1.65; text-align: center;">
                ${C.footerLegal} · Bangalore (HQ) · hr@nuriek.com<br />
                Confidential — do not forward your password.
              </p>
            </td>
          </tr>`;

    return nuriekEmailDocument({
        title: `Welcome to ${C.brand} core`,
        eyebrow: "Nuriek Core · Onboarding",
        headline: `Welcome, ${name}`,
        bodyHtml,
        headerImageHtml: nuriekEmailHeaderRow(imageUrl),
        footerHtml,
    });
}
