
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: "smtp.zoho.in",
  port: 465,
  secure: true,
  auth: {
    user: process.env.ZOHO_USER,
    pass: process.env.ZOHO_PASSWORD,
  },
});

export async function sendOnboardingEmail(user: { name: string, email: string }) {
  const { name, email } = user;

  // Log content for debug
  console.log(`[Mail] Attempting to send onboarding email to ${email} via Zoho...`);

  if (!process.env.ZOHO_USER || !process.env.ZOHO_PASSWORD) {
    console.warn("ZOHO credentials missing. Email not sent.");
    return { success: false, message: "Missing Zoho credentials in .env" };
  }

  try {
    const info = await transporter.sendMail({
      from: `"Nuriek Team" <${process.env.ZOHO_USER}>`,
      to: email,
      subject: 'Welcome to Nuriek - Onboarding Instructions',
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); border: 1px solid #f0f0f0;">
          <div style="background-color: #0f172a; background-image: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 40px 20px; text-align: center;">
             <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700;">Welcome to Nuriek</h1>
             <p style="color: rgba(255,255,255,0.8); margin: 10px 0 0; font-size: 16px;">We're thrilled to have you on board!</p>
          </div>
          
          <div style="padding: 40px 30px;">
            <p style="color: #333; font-size: 16px; line-height: 1.6;">Hi <strong>${name}</strong>,</p>
            <p style="color: #555; font-size: 16px; line-height: 1.6;">Your official Nuriek account has been created. You can now access the internal portal to complete your onboarding process.</p>
            
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 25px; margin: 30px 0; border-radius: 8px;">
              <p style="margin: 0 0 15px; color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">ACCESS CREDENTIALS</p>
              
              <div style="margin-bottom: 12px;">
                  <span style="display: inline-block; width: 80px; color: #64748b; font-size: 14px;">Email:</span>
                  <strong style="color: #334155; font-size: 15px;">${email}</strong>
              </div>
              <div style="margin-bottom: 20px;">
                  <span style="display: inline-block; width: 80px; color: #64748b; font-size: 14px;">Password:</span>
                  <code style="background: #e0f2fe; padding: 4px 8px; border-radius: 4px; color: #0284c7; font-size: 15px; font-family: monospace;">password123</code>
              </div>
              
              <div style="text-align: center; margin-top: 25px;">
                  <a href="${process.env.NEXTAUTH_URL || 'http://localhost:3000'}" style="background-color: #0f172a; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; display: inline-block; transition: background-color 0.2s;">Login to Portal</a>
              </div>
            </div>
            
            <h3 style="color: #334155; font-size: 18px; margin-top: 30px; font-weight: 600;">Next Steps:</h3>
            <ul style="color: #475569; font-size: 15px; line-height: 1.6; padding-left: 20px;">
              <li style="margin-bottom: 10px;">Log in using the temporary password above.</li>
              <li style="margin-bottom: 10px;">Navigate to <strong>Settings</strong> to change your password immediately.</li>
              <li style="margin-bottom: 10px;">Complete your profile and sign pending documents.</li>
            </ul>
            
            <p style="color: #475569; font-size: 15px; margin-top: 30px;">If you have any trouble logging in, please contact the IT Helpdesk.</p>
          </div>
          
          <div style="background-color: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
            <p style="margin: 0; font-size: 12px; color: #94a3b8;">&copy; 2026 Nuriek Inc. All rights reserved.</p>
          </div>
        </div>
      `,
    });

    console.log(`[Mail] Email sent: ${info.messageId}`);
    return { success: true, data: info };
  } catch (error) {
    console.error("Failed to send email via Zoho:", error);
    return { success: false, error };
  }
}

export async function sendDocumentNotification(docTitle: string, docUrl: string, recipients: string[]) {
  console.log(`[Mail] Sending document notification to ${recipients.length} recipients...`);

  if (!process.env.ZOHO_USER || !process.env.ZOHO_PASSWORD) {
    console.warn("ZOHO credentials missing. Email not sent.");
    return { success: false, message: "Missing Zoho credentials" };
  }

  // Batch recipients if too many (simple split for now, though SMTP usually handles BCC limits)
  // We'll send as one batch for now assuming < 100 users.
  try {
    const info = await transporter.sendMail({
      from: `"Nuriek HR" <${process.env.ZOHO_USER}>`,
      bcc: recipients, // Use BCC for privacy
      subject: `New Document: ${docTitle}`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; color: #333;">
          <h2 style="color: #0f172a;">New Document Available</h2>
          <p>A new document has been uploaded to the Company Drive:</p>
          
          <div style="background: #f1f5f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <strong style="font-size: 18px;">${docTitle}</strong>
          </div>
          
          <p>You can access it directly via the portal:</p>
          <a href="${docUrl.startsWith('http') ? docUrl : `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}${docUrl}`}" 
             style="background: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; display: inline-block;">
             View Document
          </a>
          
          <p style="margin-top: 30px; font-size: 12px; color: #666;">
            This is an automated notification from Nuriek Drive.
          </p>
        </div>
      `,
    });
    console.log(`[Mail] Notification sent: ${info.messageId}`);
    return { success: true };
  } catch (error) {
    console.error("[Mail] Failed to send notification:", error);
    return { success: false, error };
  }
}

export async function sendTimesheetApprovalEmail(employeeName: string, date: string, recipients: string[]) {
  console.log(`[Mail] Sending timesheet approval request to ${recipients.length} HR admins...`);

  if (!process.env.ZOHO_USER || !process.env.ZOHO_PASSWORD) {
    console.warn("ZOHO credentials missing. Email not sent.");
    return { success: false, message: "Missing Zoho credentials" };
  }

  try {
    const info = await transporter.sendMail({
      from: `"Nuriek HR" <${process.env.ZOHO_USER}>`,
      bcc: recipients,
      subject: `Timesheet Approval Required: ${employeeName}`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; color: #333;">
          <h2 style="color: #0f172a;">Pending Timesheet Approval</h2>
          <p>A new timesheet has been submitted and requires your approval:</p>
          
          <div style="background: #f1f5f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0 0 10px 0;"><strong>Employee:</strong> ${employeeName}</p>
            <p style="margin: 0;"><strong>Date:</strong> ${date}</p>
          </div>
          
          <p>Please log in to the portal and navigate to the <strong>Admin Timesheets</strong> section to approve or reject this submission.</p>
          <a href="${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/admin/timesheets" 
             style="background: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; display: inline-block;">
             Review Timesheet
          </a>
          
          <p style="margin-top: 30px; font-size: 12px; color: #666;">
            This is an automated notification from Nuriek HR.
          </p>
        </div>
      `,
    });
    console.log(`[Mail] Timesheet notification sent: ${info.messageId}`);
    return { success: true };
  } catch (error) {
    console.error("[Mail] Failed to send timesheet notification:", error);
    return { success: false, error };
  }
}
