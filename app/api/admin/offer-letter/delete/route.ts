import { NextResponse } from "next/server";
import { requireHrPermission, isNextResponse } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { deleteOfferLetterByIdOrRef } from "@/lib/offer-letter-delete";

/** Delete one offer by database id or NRK-OFR ref (POST avoids URL encoding edge cases). */
export async function POST(req: Request) {
    const user = await requireHrPermission("offer_letter");
    if (isNextResponse(user)) return user;

    try {
        const body = await req.json();
        const id = String(body.id || "").trim();
        const refNumber = String(body.refNumber || "").trim();
        const key = id || refNumber;

        if (!key) {
            return NextResponse.json(
                { error: "Provide id or refNumber (e.g. NRK-OFR-…)" },
                { status: 400 }
            );
        }

        const result = await deleteOfferLetterByIdOrRef(key);
        if (!result.deleted) {
            return NextResponse.json(
                {
                    error: "Offer not found in the database. If you only generated a preview, it was never saved — clear the ref chip or run database migrations and generate again.",
                    code: "NOT_FOUND",
                },
                { status: 404 }
            );
        }

        await logAudit({
            actorId: user.id,
            actorEmail: user.email,
            action: "OFFER_DELETE",
            entity: "OfferLetter",
            metadata: {
                refNumber: result.refNumber,
                candidateName: result.candidateName,
            },
        });

        return NextResponse.json({
            ok: true,
            refNumber: result.refNumber,
            candidateName: result.candidateName,
        });
    } catch (error) {
        console.error("Offer delete (by ref):", error);
        const message =
            error instanceof Error ? error.message : "Failed to delete offer";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
