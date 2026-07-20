import { NextResponse } from "next/server";
import { requireHrPermission, isNextResponse } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { buildInternFinishLetterHtml, FinishLetterInput } from "@/lib/finish-letter-intern";
import { sendFinishLetterEmail } from "@/lib/finish-letter-email";
import { logAudit } from "@/lib/audit";
import { reportingManagerDisplayName } from "@/lib/reporting-manager";

export async function POST(
    req: Request,
    { params }: { params: { id: string } }
) {
    const user = await requireHrPermission("offer_letter");
    if (isNextResponse(user)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { lastWorkingDate, hrSignatory, hrSignatoryTitle, toEmail } = body;
        
        if (!lastWorkingDate) {
            return NextResponse.json({ error: "Last working date is required" }, { status: 400 });
        }

        const internId = params.id;
        const intern = await prisma.user.findUnique({
            where: { id: internId },
            include: {
                profile: true,
                reportsTo: true,
            }
        });

        if (!intern) {
            return NextResponse.json({ error: "Intern not found" }, { status: 404 });
        }

        const emailTo = (toEmail || intern.personalEmail || intern.email || "").trim().toLowerCase();
        if (!emailTo || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTo)) {
            return NextResponse.json(
                { error: "A valid recipient email is required (preferably personal email)" },
                { status: 400 }
            );
        }

        // Generate Finish Letter HTML
        const finishLetterData: FinishLetterInput = {
            internName: intern.name || "Intern",
            issueDate: new Date().toISOString(),
            joiningDate: intern.profile?.joinDate.toISOString() || new Date().toISOString(),
            lastWorkingDate: new Date(lastWorkingDate).toISOString(),
            department: intern.profile?.department || "General",
            position: intern.profile?.position || "Intern",
            reportingManager: intern.reportsTo ? reportingManagerDisplayName(intern.reportsTo) : "Manager",
            hrSignatory: hrSignatory || user.name || "Human Resources",
            hrSignatoryTitle: hrSignatoryTitle || "HR Team",
        };

        const html = buildInternFinishLetterHtml(finishLetterData);

        // Send Email
        const result = await sendFinishLetterEmail({
            to: emailTo,
            candidateName: finishLetterData.internName,
            position: finishLetterData.position,
            department: finishLetterData.department,
            finishLetterHtml: html,
        });

        if (!result.success) {
            const errMsg = "message" in result && result.message
                ? result.message
                : "Failed to send email. Check Zoho credentials.";
            return NextResponse.json({ error: errMsg }, { status: 502 });
        }

        // Log Audit Event
        await logAudit({
            actorId: user.id,
            actorEmail: user.email,
            action: "FINISH_LETTER_SENT",
            entity: "User",
            entityId: intern.id,
            metadata: { emailedTo: emailTo },
        });

        return NextResponse.json({ success: true, sentTo: emailTo });
    } catch (error) {
        console.error("Finish letter send error:", error);
        return NextResponse.json({ error: "Failed to generate or send finish letter" }, { status: 500 });
    }
}
