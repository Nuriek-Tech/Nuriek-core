import { sendWithRetry } from "@/lib/email-queue";
import { nuriekEmailHeaderAttachment } from "@/lib/email-header-asset";
import { createZohoTransporter, formatZohoSmtpError, isZohoConfigured, zohoMailFrom } from "@/lib/zoho-smtp";
import { NURIEK_EMAIL, nuriekEmailDocument, nuriekEmailHeaderRow } from "@/lib/nuriek-email-theme";
import { nuriekEmailHeaderCidSrc } from "@/lib/email-header-asset";

export type FinishLetterEmailParams = {
    to: string;
    candidateName: string;
    position: string;
    department: string;
    finishLetterHtml: string;
};

export function buildFinishLetterEmailBody(params: FinishLetterEmailParams): string {
    const C = NURIEK_EMAIL;
    const firstName = params.candidateName.split(" ")[0] || params.candidateName;
    const deptLine = params.department
        ? ` in the <strong style="color: ${C.purpleDeep};">${params.department}</strong> department`
        : "";

    const bodyHtml = `
      <p style="margin: 0 0 16px; color: ${C.textMuted}; font-size: 15px; line-height: 1.65;">
        Dear ${firstName},
      </p>
      <p style="margin: 0 0 16px; color: ${C.textMuted}; font-size: 15px; line-height: 1.65;">
        Congratulations on successfully completing your internship as <strong style="color: ${C.purpleDeep};">${params.position}</strong>${deptLine} at <strong style="color: ${C.text};">${C.footerLegal}</strong>.
      </p>
      <p style="margin: 0 0 16px; color: ${C.textMuted}; font-size: 15px; line-height: 1.65;">
        Please find your Internship Completion Letter attached below. We wish you all the best in your future endeavors!
      </p>
      <p style="margin: 18px 0 0; font-size: 13px; color: ${C.textSoft}; line-height: 1.55;">
        Questions? Reply to this email or contact <a href="mailto:hr@nuriek.com" style="color: ${C.purpleDeep}; text-decoration: none;">hr@nuriek.com</a>.
      </p>`;

    return nuriekEmailDocument({
        title: `Internship Completion — ${C.brand}`,
        eyebrow: "Internship Completion",
        headline: `Thank you for your contributions at ${C.brand}`,
        bodyHtml,
        headerImageHtml: nuriekEmailHeaderRow(nuriekEmailHeaderCidSrc()),
    });
}

export async function sendFinishLetterEmail(params: FinishLetterEmailParams) {
    if (!isZohoConfigured()) {
        return { success: false, message: "Missing Zoho credentials in .env" };
    }

    const htmlBody = buildFinishLetterEmailBody(params);

    const result = await sendWithRetry(async () => {
        const info = await getTransporter().sendMail({
            from: zohoMailFrom(),
            to: params.to,
            subject: `Internship Completion Letter - ${params.candidateName}`,
            html: htmlBody,
            attachments: [
                nuriekEmailHeaderAttachment(),
                {
                    filename: `Internship_Completion_${params.candidateName.replace(/\s+/g, '_')}.html`,
                    content: params.finishLetterHtml,
                    contentType: 'text/html'
                }
            ],
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

function getTransporter() {
    return createZohoTransporter();
}
