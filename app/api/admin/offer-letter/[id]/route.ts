import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireHrPermission, isNextResponse } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";

export async function DELETE(
    _req: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    const user = await requireHrPermission("offer_letter");
    if (isNextResponse(user)) return user;

    try {
        const { id } = await props.params;
        const offer = await prisma.offerLetter.findUnique({
            where: { id },
            select: { id: true, refNumber: true, candidateName: true },
        });

        if (!offer) {
            return NextResponse.json({ error: "Offer not found" }, { status: 404 });
        }

        await prisma.offerLetter.delete({ where: { id } });

        await logAudit({
            actorId: user.id,
            actorEmail: user.email,
            action: "OFFER_DELETE",
            entity: "OfferLetter",
            entityId: id,
            metadata: { refNumber: offer.refNumber, candidateName: offer.candidateName },
        });

        return NextResponse.json({ ok: true, deletedId: id });
    } catch (error) {
        console.error("Offer delete:", error);
        return NextResponse.json({ error: "Failed to delete offer" }, { status: 500 });
    }
}
