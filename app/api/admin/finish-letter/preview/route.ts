import { NextResponse } from "next/server";
import { requireHrPermission, isNextResponse } from "@/lib/rbac";
import { buildInternFinishLetterHtml, FinishLetterInput } from "@/lib/finish-letter-intern";

export async function POST(req: Request) {
    const user = await requireHrPermission("offer_letter");
    if (isNextResponse(user)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await req.json();
        
        const finishLetterData: FinishLetterInput = {
            internName: body.candidateName || "Intern Name",
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

        let html = buildInternFinishLetterHtml(finishLetterData);
        html = html.replace(/<button[^>]*class="print-btn"[^>]*>[\s\S]*?<\/button>/gi, "");

        return NextResponse.json({ html });
    } catch (error) {
        console.error("Finish letter preview error:", error);
        return NextResponse.json({ error: "Failed to generate preview" }, { status: 500 });
    }
}
