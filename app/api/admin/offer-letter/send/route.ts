import { NextResponse } from "next/server";
import { requireHrPermission, isNextResponse } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { sendOfferLetterEmail } from "@/lib/mail";
import { resolveOfferEmploymentType } from "@/lib/offer-letter";
import { logAudit } from "@/lib/audit";

function formatValidUntil(date: Date | null | undefined): string | undefined {
    if (!date) return undefined;
    return date.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
}

export async function POST(req: Request) {
    const user = await requireHrPermission("offer_letter");
    if (isNextResponse(user)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await req.json();
        const token = String(body.token || "").trim();
        let to = String(body.email || "").trim().toLowerCase();

        if (!token) {
            return NextResponse.json({ error: "Offer token is required" }, { status: 400 });
        }

        const offer = await prisma.offerLetter.findUnique({ where: { token } });
        if (!offer) {
            return NextResponse.json({ error: "Offer letter not found. Generate it again." }, { status: 404 });
        }

        if (offer.expiresAt && offer.expiresAt < new Date()) {
            return NextResponse.json({ error: "This offer has expired" }, { status: 410 });
        }

        if (body.userId) {
            const directoryUser = await prisma.user.findUnique({
                where: { id: String(body.userId) },
                select: { email: true, name: true },
            });
            if (directoryUser?.email) {
                to = directoryUser.email.toLowerCase();
            }
        }

        if (!to && offer.candidateEmail) {
            to = offer.candidateEmail.toLowerCase();
        }

        if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
            return NextResponse.json(
                { error: "A valid recipient email is required (candidate email or directory employee)" },
                { status: 400 }
            );
        }

        const employmentType = resolveOfferEmploymentType(offer);

        const result = await sendOfferLetterEmail({
            to,
            candidateName: offer.candidateName,
            position: offer.position,
            department: offer.department || "your team",
            refNumber: offer.refNumber,
            offerToken: offer.token,
            validUntil: formatValidUntil(offer.expiresAt),
            employmentType,
        });

        if (!result.success) {
            const errMsg =
                "message" in result && result.message
                    ? result.message
                    : "Failed to send email. Check Zoho credentials.";
            return NextResponse.json({ error: errMsg }, { status: 502 });
        }

        await prisma.offerLetter.update({
            where: { id: offer.id },
            data: {
                emailedAt: new Date(),
                candidateEmail: to,
                status: offer.status === "SIGNED" ? "SIGNED" : "SENT",
            },
        });

        await logAudit({
            actorId: user.id,
            actorEmail: user.email,
            action: "DOCUMENT_UPLOAD",
            entity: "OfferLetter",
            metadata: { ref: offer.refNumber, emailedTo: to, token: offer.token },
        });

        return NextResponse.json({ success: true, sentTo: to });
    } catch (error) {
        console.error("Offer letter send error:", error);
        return NextResponse.json({ error: "Failed to send offer letter email" }, { status: 500 });
    }
}
