import { NextResponse } from "next/server";
import { requireHrPermission, isNextResponse } from "@/lib/rbac";
import { buildInternFinishLetterHtml, FinishLetterInput } from "@/lib/finish-letter-intern";
import { sendFinishLetterEmail } from "@/lib/finish-letter-email";
import { logAudit } from "@/lib/audit";

export async function POST(req: Request) {
    const user = await requireHrPermission("offer_letter");
    if (isNextResponse(user)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { candidateEmail, candidateName, userId } = body;

        const emailTo = (candidateEmail || "").trim().toLowerCase();
        if (!emailTo || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTo)) {
            return NextResponse.json(
                { error: "A valid recipient email is required" },
                { status: 400 }
            );
        }

        const finishLetterData: FinishLetterInput = {
            internName: candidateName || "Intern Name",
            issueDate: new Date().toISOString(),
            joiningDate: body.joiningDate ? new Date(body.joiningDate).toISOString() : new Date().toISOString(),
            lastWorkingDate: body.lastWorkingDate ? new Date(body.lastWorkingDate).toISOString() : new Date().toISOString(),
            department: body.department || "General",
            position: body.position || "Intern",
            reportingManager: body.reportingTo || "Manager",
            hrSignatory: body.hrSignatory || "Human Resources",
            hrSignatoryTitle: body.hrSignatoryTitle || "HR Team",
            hrSignatureDataUrl: body.hrSignatureDataUrl,
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
            entityId: userId || "unknown",
            metadata: { emailedTo: emailTo },
        });

        return NextResponse.json({ success: true, sentTo: emailTo });
    } catch (error) {
        console.error("Finish letter send error:", error);
        return NextResponse.json({ error: "Failed to generate or send finish letter" }, { status: 500 });
    }
}
