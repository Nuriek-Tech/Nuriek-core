import { NextRequest, NextResponse } from "next/server";
import { requireHrPermission, isNextResponse } from "@/lib/rbac";
import { revokeOfferLetter } from "@/lib/offer-revoke";

export async function POST(
    req: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    const user = await requireHrPermission("offer_letter");
    if (isNextResponse(user)) return user;

    try {
        const { id } = await props.params;
        const body = await req.json().catch(() => ({}));
        const reason = body.reason ? String(body.reason) : undefined;

        const result = await revokeOfferLetter({
            offerId: id,
            revokedById: user.id,
            revokedByEmail: user.email,
            revokedByName: user.name,
            reason,
        });

        if (!result.ok) {
            return NextResponse.json({ error: result.error }, { status: result.status });
        }

        const emailNote =
            result.emails.candidate || result.emails.hr.length > 0
                ? undefined
                : "Offer revoked, but no notification emails were sent (check candidate email and Zoho SMTP).";

        return NextResponse.json({
            ok: true,
            refNumber: result.offer.refNumber,
            revokedAt: result.offer.revokedAt,
            emails: result.emails,
            warning: emailNote,
        });
    } catch (error) {
        console.error("Offer revoke:", error);
        return NextResponse.json({ error: "Failed to revoke offer" }, { status: 500 });
    }
}
