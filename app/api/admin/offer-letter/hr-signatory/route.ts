import { NextResponse } from "next/server";
import { requireHrPermission, isNextResponse } from "@/lib/rbac";
import { getOrgHrSignatory, saveOrgHrSignatory } from "@/lib/offer-hr-signature-org";

export async function GET() {
    const user = await requireHrPermission("offer_letter");
    if (isNextResponse(user)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const prefs = await getOrgHrSignatory();
        return NextResponse.json(prefs);
    } catch (error) {
        console.error("HR signatory GET error:", error);
        return NextResponse.json({ error: "Failed to load signatory settings" }, { status: 500 });
    }
}

export async function PUT(req: Request) {
    const user = await requireHrPermission("offer_letter");
    if (isNextResponse(user)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await req.json();
        const prefs = await saveOrgHrSignatory({
            hrSignatory: body.hrSignatory != null ? String(body.hrSignatory) : undefined,
            hrSignatoryTitle:
                body.hrSignatoryTitle != null ? String(body.hrSignatoryTitle) : undefined,
            hrSignatureDataUrl:
                body.hrSignatureDataUrl != null ? String(body.hrSignatureDataUrl) : undefined,
        });
        return NextResponse.json(prefs);
    } catch (error) {
        const message =
            error instanceof Error ? error.message : "Failed to save signatory settings";
        return NextResponse.json({ error: message }, { status: 400 });
    }
}
