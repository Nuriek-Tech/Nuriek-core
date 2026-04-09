import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const ADMIN_ROLES = ["FOUNDER", "HR_ADMIN"];

export async function GET(req: Request, { params }: { params: { id: string } }) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return new NextResponse("Unauthorized", { status: 401 });

    const userId = (session.user as any).id;
    const userRole = (session.user as any).role;
    const isAdmin = ADMIN_ROLES.includes(userRole);

    try {
        const request = await (prisma as any).certificateRequest.findUnique({
            where: { id: params.id },
            include: {
                user: {
                    include: { profile: true }
                }
            }
        });

        if (!request) return new NextResponse("Not Found", { status: 404 });

        // Only the owner or admin can generate
        if (!isAdmin && request.userId !== userId) {
            return new NextResponse("Forbidden", { status: 403 });
        }

        if (request.status !== "APPROVED") {
            return new NextResponse("Certificate is not yet approved", { status: 403 });
        }

        const user = request.user;
        const profile = user.profile;
        const today = new Date();
        const formattedDate = today.toLocaleDateString("en-IN", {
            day: "numeric", month: "long", year: "numeric"
        });
        const joinDate = profile?.joinDate
            ? new Date(profile.joinDate).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })
            : "the date of joining";

        const approvedDate = request.approvedAt
            ? new Date(request.approvedAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })
            : formattedDate;

        const roleFriendly = (user.role || "Employee").replace(/_/g, " ").split(" ").map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
        const department = profile?.department || "the organization";
        const position = profile?.position || roleFriendly;

        let bodyText = "";
        let heading = "";

        if (request.type === "EXPERIENCE") {
            heading = "EXPERIENCE CERTIFICATE";
            bodyText = `
                <p>This is to certify that <strong>${user.name}</strong> was employed with <strong>Nuriek Technologies Private Limited</strong>
                as a <strong>${position}</strong> in the <strong>${department}</strong> department, with effect from <strong>${joinDate}</strong>.</p>

                <p>During their tenure with us, ${user.name} demonstrated strong professional ethics, technical competence, and contributed positively to the organization's goals.</p>

                <p>We wish ${user.name} the very best in all future endeavors.</p>
            `;
        } else {
            heading = "BONAFIDE CERTIFICATE";
            const purposeText = request.purpose ? `for the purpose of <strong>${request.purpose}</strong>` : "as proof of employment";
            bodyText = `
                <p>This is to certify that <strong>${user.name}</strong> (Email: <strong>${user.email}</strong>) is a bonafide
                ${roleFriendly} of <strong>Nuriek Technologies Private Limited</strong>, working in the
                <strong>${department}</strong> department as <strong>${position}</strong>, with effect from <strong>${joinDate}</strong>.</p>

                <p>This certificate is issued ${purposeText}, on their request.</p>
            `;
        }

        const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${heading} — ${user.name}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Playfair+Display:wght@700&display=swap');

    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: 'Inter', sans-serif;
      background: #f4f4f4;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      padding: 2rem;
    }

    .certificate {
      background: #fff;
      width: 794px;
      min-height: 1123px;
      padding: 60px 80px;
      border: 2px solid #e5e7eb;
      border-radius: 4px;
      position: relative;
      display: flex;
      flex-direction: column;
    }

    .corner-accent {
      position: absolute;
      width: 80px;
      height: 80px;
      border-color: #1a1a2e;
      border-style: solid;
    }
    .corner-accent.tl { top: 20px; left: 20px; border-width: 3px 0 0 3px; }
    .corner-accent.tr { top: 20px; right: 20px; border-width: 3px 3px 0 0; }
    .corner-accent.bl { bottom: 20px; left: 20px; border-width: 0 0 3px 3px; }
    .corner-accent.br { bottom: 20px; right: 20px; border-width: 0 3px 3px 0; }

    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 40px;
      padding-bottom: 24px;
      border-bottom: 2px solid #1a1a2e;
    }

    .company-name {
      font-size: 1.6rem;
      font-weight: 700;
      color: #1a1a2e;
      letter-spacing: -0.5px;
    }

    .company-sub {
      font-size: 0.78rem;
      color: #6b7280;
      margin-top: 2px;
      letter-spacing: 0.5px;
    }

    .logo-circle {
      width: 60px;
      height: 60px;
      background: linear-gradient(135deg, #1a1a2e, #4f46e5);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 1.5rem;
      font-weight: 800;
    }

    .cert-heading {
      text-align: center;
      margin: 30px 0;
    }

    .cert-heading h1 {
      font-family: 'Playfair Display', serif;
      font-size: 2rem;
      color: #1a1a2e;
      letter-spacing: 3px;
      text-transform: uppercase;
    }

    .cert-heading .underline {
      width: 80px;
      height: 3px;
      background: linear-gradient(90deg, #4f46e5, #7c3aed);
      margin: 10px auto 0;
      border-radius: 2px;
    }

    .ref-date {
      display: flex;
      justify-content: space-between;
      font-size: 0.82rem;
      color: #6b7280;
      margin-bottom: 32px;
    }

    .body-content {
      flex: 1;
      font-size: 0.97rem;
      line-height: 1.9;
      color: #374151;
    }

    .body-content p {
      margin-bottom: 1.2rem;
      text-align: justify;
    }

    .body-content strong {
      color: #1a1a2e;
      font-weight: 600;
    }

    .footer {
      margin-top: 60px;
      padding-top: 30px;
      border-top: 1px solid #e5e7eb;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }

    .signature-block {
      text-align: center;
    }

    .signature-line {
      width: 180px;
      border-bottom: 2px solid #1a1a2e;
      margin-bottom: 6px;
    }

    .signature-name {
      font-weight: 600;
      font-size: 0.9rem;
      color: #1a1a2e;
    }

    .signature-title {
      font-size: 0.78rem;
      color: #6b7280;
    }

    .seal {
      width: 90px;
      height: 90px;
      border: 3px solid #1a1a2e;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      text-align: center;
      font-size: 0.6rem;
      font-weight: 700;
      color: #1a1a2e;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      padding: 10px;
    }

    .verified-badge {
      margin-top: 32px;
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-radius: 6px;
      padding: 10px 16px;
      font-size: 0.78rem;
      color: #166534;
      text-align: center;
    }

    .print-btn {
      position: fixed;
      bottom: 24px;
      right: 24px;
      background: linear-gradient(135deg, #4f46e5, #7c3aed);
      color: white;
      border: none;
      border-radius: 50px;
      padding: 14px 28px;
      font-size: 0.92rem;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 8px 24px rgba(79,70,229,0.4);
      display: flex;
      align-items: center;
      gap: 8px;
      font-family: 'Inter', sans-serif;
    }

    @media print {
      body { background: white; padding: 0; }
      .print-btn { display: none; }
      .certificate { border: none; }
    }
  </style>
</head>
<body>
  <div class="certificate">
    <div class="corner-accent tl"></div>
    <div class="corner-accent tr"></div>
    <div class="corner-accent bl"></div>
    <div class="corner-accent br"></div>

    <div class="header">
      <div>
        <div class="company-name">Nuriek Technologies</div>
        <div class="company-sub">PRIVATE LIMITED · CIN: U72900KA2024PTC000000</div>
        <div class="company-sub">Bengaluru, Karnataka · hr@nuriek.com</div>
      </div>
      <div class="logo-circle">N</div>
    </div>

    <div class="cert-heading">
      <h1>${heading}</h1>
      <div class="underline"></div>
    </div>

    <div class="ref-date">
      <span>Ref. No: NRK-${request.type.charAt(0)}-${params.id.slice(-6).toUpperCase()}</span>
      <span>Date: ${formattedDate}</span>
    </div>

    <div class="body-content">
      <p>To Whomsoever It May Concern,</p>
      ${bodyText}
      <p>This certificate is issued in good faith and is valid as of the date mentioned above.</p>
    </div>

    <div class="footer">
      <div class="signature-block">
        <div class="signature-line"></div>
        <div class="signature-name">${request.approvedBy || "Authorized Signatory"}</div>
        <div class="signature-title">Human Resources · Nuriek Technologies Pvt. Ltd.</div>
      </div>

      <div class="seal">
        Nuriek<br>Technologies<br>Pvt. Ltd.
      </div>
    </div>

    <div class="verified-badge">
      ✓ Digitally generated on ${approvedDate} via Nuriek Core HR Platform · Ref: NRK-${params.id.slice(-8).toUpperCase()}
    </div>
  </div>

  <button class="print-btn" onclick="window.print()">
    ⬇ Download / Print Certificate
  </button>
</body>
</html>`;

        return new NextResponse(html, {
            headers: { "Content-Type": "text/html; charset=utf-8" }
        });
    } catch (error) {
        console.error("[GET /api/certificate-requests/[id]/generate]", error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}
