import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
    _req: Request,
    { params }: { params: Promise<{ token: string }> }
) {
    const { token } = await params;

    if (!token) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const offer = await prisma.offerLetter.findUnique({ where: { token } });
    if (!offer) {
        return NextResponse.json({ error: "Offer not found" }, { status: 404 });
    }

    if (offer.expiresAt && offer.expiresAt < new Date()) {
        return NextResponse.json({ error: "This offer has expired" }, { status: 410 });
    }

    const { getOfferDisplayHtmlHydrated } = await import("@/lib/offer-letter-workflow");

    return NextResponse.json({
        html: await getOfferDisplayHtmlHydrated(offer),
        refNumber: offer.refNumber,
        candidateName: offer.candidateName,
        position: offer.position,
        status: offer.status,
        signedAt: offer.signedAt,
    });
}
