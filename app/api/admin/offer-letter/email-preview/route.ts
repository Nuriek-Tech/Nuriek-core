import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireHrPermission, isNextResponse } from "@/lib/rbac";
import { buildOfferEmailPreviewParams } from "@/lib/offer-email-preview";
import { buildOfferLetterEmailHtml, offerLetterEmailSubject } from "@/lib/offer-letter-email";
import { resolveOfferEmploymentType } from "@/lib/offer-letter";

export async function POST(req: Request) {
    const user = await requireHrPermission("offer_letter");
    if (isNextResponse(user)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await req.json();
        const token = String(body.token || "").trim();

        if (!token) {
            return NextResponse.json({ error: "Token required" }, { status: 400 });
        }

        const offer = await prisma.offerLetter.findUnique({
            where: { token },
            include: { createdBy: { select: { name: true } } },
        });

        if (!offer) {
            return NextResponse.json({ error: "Offer not found" }, { status: 404 });
        }

        const employmentType = resolveOfferEmploymentType(offer);
        const emailHtml = buildOfferLetterEmailHtml(
            buildOfferEmailPreviewParams(offer),
            "preview"
        );

        return NextResponse.json({
            emailHtml,
            subject: offerLetterEmailSubject(offer.position, employmentType),
            to: offer.candidateEmail,
        });
    } catch (error) {
        console.error("Email preview error:", error);
        return NextResponse.json({ error: "Failed to build email preview" }, { status: 500 });
    }
}
