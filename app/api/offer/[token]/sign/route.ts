import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
    applyOfferSignature,
    getOfferDisplayHtmlHydrated,
    OFFER_STATUS,
} from "@/lib/offer-letter-workflow";
import { logAudit } from "@/lib/audit";
import { provisionUserFromSignedOffer } from "@/lib/offer-provision";

export async function POST(
    req: Request,
    { params }: { params: Promise<{ token: string }> }
) {
    const { token } = await params;

    try {
        const body = await req.json();
        const signedName = String(body.signedName || "").trim();
        const signedPlace = String(body.signedPlace || "").trim();
        const signatureText = String(body.signatureText || signedName).trim();
        const signedDate =
            String(body.signedDate || "").trim() ||
            new Date().toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
            });

        if (!signedName || !signedPlace || !signatureText) {
            return NextResponse.json(
                { error: "Name, place, and signature are required" },
                { status: 400 }
            );
        }

        const offer = await prisma.offerLetter.findUnique({ where: { token } });
        if (!offer) {
            return NextResponse.json({ error: "Offer not found" }, { status: 404 });
        }

        if (offer.expiresAt && offer.expiresAt < new Date()) {
            return NextResponse.json({ error: "This offer has expired" }, { status: 410 });
        }

        if (offer.status === OFFER_STATUS.SIGNED || offer.signedAt) {
            return NextResponse.json(
                {
                    error: "This offer has already been signed",
                    signedHtml: offer.signedHtml ?? offer.html,
                },
                { status: 409 }
            );
        }

        if (offer.status === OFFER_STATUS.DECLINED || offer.declinedAt) {
            return NextResponse.json(
                { error: "This offer was declined and can no longer be signed" },
                { status: 409 }
            );
        }

        const baseHtml = await getOfferDisplayHtmlHydrated(offer);
        const signedHtml = applyOfferSignature(baseHtml, {
            signedName,
            signedPlace,
            signedDate,
            signatureText,
        });

        const updated = await prisma.offerLetter.update({
            where: { id: offer.id },
            data: {
                status: OFFER_STATUS.SIGNED,
                signedAt: new Date(),
                signedName,
                signedPlace,
                signatureText,
                signedHtml,
                viewedAt: offer.viewedAt ?? new Date(),
            },
        });

        await logAudit({
            actorEmail: offer.candidateEmail,
            action: "OFFER_SIGNED",
            entity: "OfferLetter",
            entityId: offer.id,
            metadata: {
                ref: offer.refNumber,
                candidate: signedName,
                token,
            },
        });

        const provision = await provisionUserFromSignedOffer(updated, signedName);

        return NextResponse.json({
            success: true,
            signedHtml: updated.signedHtml,
            signedAt: updated.signedAt,
            provision: provision.ok
                ? {
                      userId: provision.user.id,
                      email: provision.user.email,
                      role: provision.user.role,
                      created: provision.created,
                  }
                : { pending: true, reason: provision.reason, message: provision.message },
        });
    } catch (error) {
        console.error("Offer sign error:", error);
        return NextResponse.json({ error: "Failed to record signature" }, { status: 500 });
    }
}
