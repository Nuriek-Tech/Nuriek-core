import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { OFFER_STATUS } from "@/lib/offer-letter-workflow";
import { logAudit } from "@/lib/audit";

export async function POST(
    req: Request,
    { params }: { params: Promise<{ token: string }> }
) {
    const { token } = await params;

    try {
        const body = await req.json().catch(() => ({}));
        const declineReason = body.declineReason
            ? String(body.declineReason).trim().slice(0, 500)
            : null;

        const offer = await prisma.offerLetter.findUnique({ where: { token } });
        if (!offer) {
            return NextResponse.json({ error: "Offer not found" }, { status: 404 });
        }

        if (offer.status === OFFER_STATUS.SIGNED || offer.signedAt) {
            return NextResponse.json(
                { error: "This offer has already been accepted" },
                { status: 409 }
            );
        }

        if (offer.status === OFFER_STATUS.REVOKED || offer.revokedAt) {
            return NextResponse.json(
                { error: "This offer has been withdrawn by HR" },
                { status: 410 }
            );
        }

        if (offer.status === OFFER_STATUS.DECLINED || offer.declinedAt) {
            return NextResponse.json(
                {
                    error: "This offer was already declined",
                    declinedAt: offer.declinedAt,
                    declineReason: offer.declineReason,
                },
                { status: 409 }
            );
        }

        if (offer.expiresAt && offer.expiresAt < new Date()) {
            return NextResponse.json({ error: "This offer has expired" }, { status: 410 });
        }

        const updated = await prisma.offerLetter.update({
            where: { id: offer.id },
            data: {
                status: OFFER_STATUS.DECLINED,
                declinedAt: new Date(),
                declineReason,
                viewedAt: offer.viewedAt ?? new Date(),
            },
        });

        await logAudit({
            actorEmail: offer.candidateEmail,
            action: "OFFER_DECLINED",
            entity: "OfferLetter",
            entityId: offer.id,
            metadata: {
                ref: offer.refNumber,
                candidate: offer.candidateName,
                token,
                declineReason,
            },
        });

        return NextResponse.json({
            success: true,
            declinedAt: updated.declinedAt,
            declineReason: updated.declineReason,
        });
    } catch (error) {
        console.error("Offer decline error:", error);
        return NextResponse.json({ error: "Failed to record decline" }, { status: 500 });
    }
}
