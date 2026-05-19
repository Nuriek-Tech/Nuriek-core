import { sendWithRetry } from "@/lib/email-queue";
import { nuriekEmailHeaderAttachment } from "@/lib/email-header-asset";
import { portalAppUrl, portalEmailUrl } from "@/lib/portal-url";
import {
    createZohoTransporter,
    formatZohoSmtpError,
    isZohoConfigured,
    zohoMailFrom,
} from "@/lib/zoho-smtp";

function getTransporter() {
    return createZohoTransporter();
}

function portalUrl(path = "") {
    return portalAppUrl(path);
}

/** Links in outbound emails — always a public URL (www.core.nuriek.com in production). */
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
            html: `
        <div style="font-family: sans-serif; padding: 20px;">
          <h2>New Document Available</h2>
          <p><strong>${docTitle}</strong> was uploaded to the Company Drive.</p>
          <a href="${fullUrl}">Open in portal</a>
        </div>
      `,
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
            html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
          <h1 style="color: #0f172a; font-size: 22px;">Signature requested</h1>
          <p>Hello,</p>
          <p>You have been asked to review and sign <strong>${documentTitle}</strong>${signerRole ? ` as <strong>${signerRole}</strong>` : ""}.</p>
          ${description ? `<p style="color: #475569;">${description}</p>` : ""}
          <ol style="color: #334155; line-height: 1.6;">
            <li>Sign in to the Nuriek employee portal.</li>
            <li>Open <strong>Documents &amp; Policy Hub</strong>.</li>
            <li>Read the full document, then use <strong>Sign Now</strong>.</li>
          </ol>
          <a href="${documentsUrl}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin: 16px 0;">
            Open Documents Hub
          </a>
          <p style="color: #64748b; font-size: 13px;">The Sign button unlocks only after you scroll through the entire document.</p>
        </div>
      `,
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
            html: `
        <div style="font-family: sans-serif; padding: 20px;">
          <h2>Pending Timesheet Approval</h2>
          <p><strong>${employeeName}</strong> — ${date}</p>
          <a href="${portalUrl("/admin/timesheets")}">Review in portal</a>
        </div>
      `,
        });
        return { success: true };
    });
}
