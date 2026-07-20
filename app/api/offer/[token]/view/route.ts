import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { OFFER_STATUS } from "@/lib/offer-letter-workflow";

export async function POST(
    _req: Request,
    { params }: { params: Promise<{ token: string }> }
) {
    const { token } = await params;

    try {
        const offer = await prisma.offerLetter.findUnique({ where: { token } });
        if (!offer) {
            return NextResponse.json({ error: "Not found" }, { status: 404 });
        }

        if (
            offer.status === OFFER_STATUS.SIGNED ||
            offer.status === OFFER_STATUS.DECLINED ||
            offer.status === OFFER_STATUS.REVOKED ||
            offer.revokedAt
        ) {
            return NextResponse.json({
                status: offer.revokedAt ? OFFER_STATUS.REVOKED : offer.status,
            });
        }

        const nextStatus =
            offer.status === OFFER_STATUS.GENERATED || offer.status === OFFER_STATUS.SENT
                ? OFFER_STATUS.VIEWED
                : offer.status;

        await prisma.offerLetter.update({
            where: { id: offer.id },
            data: {
                viewedAt: offer.viewedAt ?? new Date(),
                status: nextStatus === OFFER_STATUS.GENERATED ? OFFER_STATUS.VIEWED : nextStatus,
            },
        });

        return NextResponse.json({ status: OFFER_STATUS.VIEWED });
    } catch (error) {
        console.error("Offer view track error:", error);
        return NextResponse.json({ ok: true });
    }
}
