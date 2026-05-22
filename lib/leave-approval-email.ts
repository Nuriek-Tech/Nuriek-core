import { NURIEK_EMAIL, nuriekEmailCta, nuriekEmailInfoBox, nuriekEmailSimple } from "@/lib/nuriek-email-theme";

export function leaveApprovalEmailSubject(employeeName: string): string {
    return `Leave approval required — ${employeeName}`;
}

export function buildLeaveApprovalEmailHtml(params: {
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
}): string {
    const C = NURIEK_EMAIL;
    const greeting = params.managerName?.trim() ? params.managerName.trim() : "there";

    const details = nuriekEmailInfoBox(
        `
        <p style="margin: 0 0 8px; font-size: 15px; color: ${C.text};"><strong>${params.employeeName}</strong></p>
        <p style="margin: 0 0 4px; font-size: 14px; color: ${C.textMuted};">${params.employeeEmail}</p>
        <p style="margin: 12px 0 4px; font-size: 14px; color: ${C.textMuted};"><strong style="color: ${C.text};">Type:</strong> ${params.leaveType.replace(/_/g, " ")}</p>
        <p style="margin: 0 0 4px; font-size: 14px; color: ${C.textMuted};"><strong style="color: ${C.text};">Dates:</strong> ${params.startDate} – ${params.endDate} (${params.days} day${params.days === 1 ? "" : "s"})</p>
        ${params.reason ? `<p style="margin: 8px 0 0; font-size: 14px; color: ${C.textMuted};"><strong style="color: ${C.text};">Reason:</strong> ${params.reason}</p>` : ""}
        `,
        "Leave request"
    );

    return nuriekEmailSimple({
        title: `Leave — ${params.employeeName}`,
        eyebrow: "Nuriek Core · Leave",
        headline: "Approval required",
        bodyHtml: `
          <p style="margin: 0 0 16px; font-size: 15px; color: ${C.textMuted}; line-height: 1.6;">
            Hi ${greeting}, <strong style="color: ${C.text};">${params.employeeName}</strong> submitted a leave request.
            Use the links below to approve or reject — no sign-in required.
          </p>
          ${details}
          ${nuriekEmailCta(params.approveUrl, "Approve leave")}
          <table role="presentation" cellspacing="0" cellpadding="0" width="100%" style="margin: 8px 0 0;">
            <tr>
              <td align="center">
                <a href="${params.rejectUrl}" style="font-size: 14px; color: #b42318; text-decoration: underline;">Reject this request</a>
              </td>
            </tr>
          </table>
          <p style="margin: 18px 0 0; font-size: 13px; color: ${C.textSoft}; line-height: 1.5;">
            Links expire in ${params.expiresDays} days. If you did not expect this email, contact HR at hr@nuriek.com.
          </p>`,
    });
}
