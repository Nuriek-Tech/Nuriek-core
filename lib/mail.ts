import { sendWithRetry } from "@/lib/email-queue";
import { nuriekEmailHeaderAttachment } from "@/lib/email-header-asset";
import { portalAppUrl, portalEmailUrl } from "@/lib/portal-url";
import {
    createZohoTransporter,
    formatZohoSmtpError,
    isZohoConfigured,
    zohoMailFrom,
} from "@/lib/zoho-smtp";
import { NURIEK_EMAIL, nuriekEmailSimple } from "@/lib/nuriek-email-theme";

function getTransporter() {
    return createZohoTransporter();
}

function portalUrl(path = "") {
    return portalAppUrl(path);
}

/** Links in outbound emails — always a public URL (core.nuriek.com in production). */
function emailPortalUrl(path = "") {
    return portalEmailUrl(path);
}

export async function sendOnboardingEmail(user: {
    name: string;
    email: string;
    temporaryPassword: string;
}) {
    return sendNuriekOnboardingEmail({
        to: user.email,
        recipientName: user.name,
        workEmail: user.email,
        password: user.temporaryPassword,
        position: "Team member",
        department: "Nuriek",
        isIntern: false,
    });
}

export async function sendNuriekOnboardingEmail(params: {
    to: string;
    recipientName: string;
    workEmail: string;
    password: string;
    position: string;
    department: string;
    isIntern: boolean;
    refNumber?: string;
}) {
    if (!isZohoConfigured()) {
        return { success: false, message: "Missing Zoho credentials in .env" };
    }

    const { buildNuriekOnboardingEmailHtml, nuriekOnboardingEmailSubject } = await import(
        "@/lib/nuriek-onboarding-email"
    );

    const loginUrl = portalUrl("/login");
    const html = buildNuriekOnboardingEmailHtml(
        {
            recipientName: params.recipientName,
            workEmail: params.workEmail,
            password: params.password,
            loginUrl,
            position: params.position,
            department: params.department,
            isIntern: params.isIntern,
            refNumber: params.refNumber,
        },
        "send"
    );

    const result = await sendWithRetry(async () => {
        const info = await getTransporter().sendMail({
            from: zohoMailFrom(),
            to: params.to,
            subject: nuriekOnboardingEmailSubject(params.isIntern),
            html,
            attachments: [nuriekEmailHeaderAttachment()],
        });
        return { success: true, data: info };
    });

    if (!result.success) {
        return {
            success: false,
            message: result.error ? formatZohoSmtpError(result.error) : "Failed to send email",
        };
    }
    return { success: true };
}

export async function sendDocumentNotification(
    docTitle: string,
    docUrl: string,
    recipients: string[]
) {
    if (!process.env.ZOHO_USER || !process.env.ZOHO_PASSWORD) {
        return { success: false, message: "Missing Zoho credentials" };
    }

    const fullUrl = docUrl.startsWith("http") ? docUrl : portalUrl(docUrl);

    return sendWithRetry(async () => {
        await getTransporter().sendMail({
            from: zohoMailFrom(),
            bcc: recipients,
            subject: `New Document: ${docTitle}`,
            html: nuriekEmailSimple({
                title: `New document — ${docTitle}`,
                eyebrow: "Nuriek Core · Documents",
                headline: "New document available",
                bodyHtml: `
              <p style="margin: 0 0 12px; font-size: 15px; color: ${NURIEK_EMAIL.textMuted}; line-height: 1.6;">
                <strong style="color: ${NURIEK_EMAIL.text};">${docTitle}</strong> was uploaded to the Company Drive.
              </p>
              <p style="margin: 0; font-size: 14px; color: ${NURIEK_EMAIL.textSoft}; line-height: 1.55;">
                Sign in to the portal to view and acknowledge if required.
              </p>`,
                ctaHref: fullUrl,
                ctaLabel: "Open in portal",
            }),
        });
        return { success: true };
    });
}

export async function sendSignatureRequestEmail(params: {
    to: string;
    documentTitle: string;
    description?: string | null;
    signerRole?: string;
}) {
    const { to, documentTitle, description, signerRole } = params;

    if (!process.env.ZOHO_USER || !process.env.ZOHO_PASSWORD) {
        console.warn("ZOHO credentials missing. Signature request email not sent.");
        return { success: false, message: "Missing Zoho credentials" };
    }

    const documentsUrl = portalUrl("/documents");

    return sendWithRetry(async () => {
        await getTransporter().sendMail({
            from: zohoMailFrom(),
            to,
            subject: `Action required: Sign "${documentTitle}"`,
            html: nuriekEmailSimple({
                title: `Sign ${documentTitle}`,
                eyebrow: "Nuriek Core · Signature",
                headline: "Signature requested",
                bodyHtml: `
              <p style="margin: 0 0 12px; font-size: 15px; color: ${NURIEK_EMAIL.textMuted}; line-height: 1.6;">
                You have been asked to review and sign <strong style="color: ${NURIEK_EMAIL.text};">${documentTitle}</strong>${signerRole ? ` as <strong>${signerRole}</strong>` : ""}.
              </p>
              ${description ? `<p style="margin: 0 0 14px; font-size: 14px; color: ${NURIEK_EMAIL.textSoft}; line-height: 1.55;">${description}</p>` : ""}
              <ol style="margin: 0; padding-left: 20px; font-size: 14px; color: ${NURIEK_EMAIL.textMuted}; line-height: 1.65;">
                <li>Sign in to the Nuriek employee portal.</li>
                <li>Open <strong>Documents &amp; Legal</strong>.</li>
                <li>Read the full document, then use <strong>Sign Now</strong>.</li>
              </ol>
              <p style="margin: 16px 0 0; font-size: 13px; color: ${NURIEK_EMAIL.textSoft}; line-height: 1.5;">
                The Sign button unlocks only after you scroll through the entire document.
              </p>`,
                ctaHref: documentsUrl,
                ctaLabel: "Open Documents Hub",
            }),
        });
        return { success: true };
    });
}

export async function sendOfferLetterEmail(params: {
    to: string;
    candidateName: string;
    position: string;
    department: string;
    refNumber: string;
    offerToken: string;
    validUntil?: string;
    employmentType?: string | null;
}) {
    const { to, candidateName, position, department, refNumber, offerToken, validUntil, employmentType } =
        params;

    if (!isZohoConfigured()) {
        return { success: false, message: "Missing Zoho credentials in .env" };
    }

    const { buildOfferLetterEmailHtml, offerLetterEmailSubject } = await import(
        "@/lib/offer-letter-email"
    );
    const offerUrl = emailPortalUrl(`/offer/${offerToken}`);

    const result = await sendWithRetry(async () => {
        const info = await getTransporter().sendMail({
            from: zohoMailFrom(),
            to,
            subject: offerLetterEmailSubject(position, employmentType),
            html: buildOfferLetterEmailHtml(
                {
                    candidateName,
                    position,
                    department,
                    refNumber,
                    offerUrl,
                    validUntil,
                    employmentType,
                },
                "send"
            ),
            attachments: [nuriekEmailHeaderAttachment()],
        });
        return { success: true, data: info };
    });

    if (!result.success) {
        return {
            success: false,
            message: result.error ? formatZohoSmtpError(result.error) : "Failed to send email",
        };
    }
    return { success: true };
}

export async function sendTimesheetApprovalEmail(
    employeeName: string,
    date: string,
    recipients: string[]
) {
    if (!process.env.ZOHO_USER || !process.env.ZOHO_PASSWORD) {
        return { success: false, message: "Missing Zoho credentials" };
    }

    return sendWithRetry(async () => {
        await getTransporter().sendMail({
            from: zohoMailFrom(),
            bcc: recipients,
            subject: `Timesheet Approval Required: ${employeeName}`,
            html: nuriekEmailSimple({
                title: `Timesheet — ${employeeName}`,
                eyebrow: "Nuriek Core · Timesheets",
                headline: "Pending timesheet approval",
                bodyHtml: `
              <p style="margin: 0; font-size: 15px; color: ${NURIEK_EMAIL.textMuted}; line-height: 1.6;">
                <strong style="color: ${NURIEK_EMAIL.text};">${employeeName}</strong> — ${date}
              </p>`,
                ctaHref: portalUrl("/admin/timesheets"),
                ctaLabel: "Review in portal",
            }),
        });
        return { success: true };
    });
}

export async function sendLeaveApprovalRequestEmail(params: {
    to: string;
    managerName?: string;
    employeeName: string;
    employeeEmail: string;
    leaveType: string;
    startDate: string;
    endDate: string;
    days: number;
    reason?: string | null;
    approveUrl: string;
    rejectUrl: string;
    expiresDays: number;
}) {
    if (!isZohoConfigured()) {
        return { success: false, message: "Missing Zoho credentials in .env" };
    }

    const {
        buildLeaveApprovalEmailHtml,
        leaveApprovalEmailSubject,
    } = await import("@/lib/leave-approval-email");

    const html = buildLeaveApprovalEmailHtml(params);

    const result = await sendWithRetry(async () => {
        const info = await getTransporter().sendMail({
            from: zohoMailFrom(),
            to: params.to,
            subject: leaveApprovalEmailSubject(params.employeeName),
            html,
            attachments: [nuriekEmailHeaderAttachment()],
        });
        return { success: true, data: info };
    });

    if (!result.success) {
        return {
            success: false,
            message: result.error ? formatZohoSmtpError(result.error) : "Failed to send email",
        };
    }
    return { success: true };
}

export async function sendPasswordResetEmail(params: {
    to: string;
    recipientName: string;
    resetUrl: string;
    expiresMinutes: number;
}) {
    if (!isZohoConfigured()) {
        return { success: false, message: "Missing Zoho credentials in .env" };
    }

    const {
        buildPasswordResetEmailHtml,
        passwordResetEmailSubject,
    } = await import("@/lib/password-reset-email");

    const html = buildPasswordResetEmailHtml({
        recipientName: params.recipientName,
        resetUrl: params.resetUrl,
        expiresMinutes: params.expiresMinutes,
    });

    const result = await sendWithRetry(async () => {
        const info = await getTransporter().sendMail({
            from: zohoMailFrom(),
            to: params.to,
            subject: passwordResetEmailSubject(),
            html,
            attachments: [nuriekEmailHeaderAttachment()],
        });
        return { success: true, data: info };
    });

    if (!result.success) {
        return {
            success: false,
            message: result.error ? formatZohoSmtpError(result.error) : "Failed to send email",
        };
    }
    return { success: true };
}
