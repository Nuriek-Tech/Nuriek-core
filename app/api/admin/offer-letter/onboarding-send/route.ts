import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireHrPermission, isNextResponse } from "@/lib/rbac";
import { sendNuriekOnboardingEmail } from "@/lib/mail";
import { ensurePortalUserForOnboarding } from "@/lib/offer-provision";
import { resolveOfferEmploymentType, isInternEmploymentType } from "@/lib/offer-letter";
import { isNuriekWorkEmail, normalizeWorkEmail } from "@/lib/email-policy";
import { logAudit } from "@/lib/audit";

export async function POST(req: Request) {
    const actor = await requireHrPermission("offer_letter");
    if (isNextResponse(actor)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await req.json();
        const token = String(body.token || "").trim();
        const workEmail = normalizeWorkEmail(String(body.workEmail || ""));
        const password = String(body.password || "").trim();
        let sendTo = String(body.sendTo || "").trim().toLowerCase();

        if (!token) {
            return NextResponse.json({ error: "Offer token is required" }, { status: 400 });
        }
        if (!isNuriekWorkEmail(workEmail)) {
            return NextResponse.json(
                { error: "Work email must be a valid @nuriek.com address (from Zoho)" },
                { status: 400 }
            );
        }
        if (!password || password.length < 8) {
            return NextResponse.json(
                { error: "Enter the portal password from Zoho (at least 8 characters)" },
                { status: 400 }
            );
        }

        const offer = await prisma.offerLetter.findUnique({ where: { token } });
        if (!offer) {
            return NextResponse.json({ error: "Offer not found" }, { status: 404 });
        }

        if (offer.status !== "SIGNED" && !offer.signedAt) {
            return NextResponse.json(
                { error: "Candidate must sign the offer before onboarding email is sent" },
                { status: 400 }
            );
        }

        if (!sendTo) {
            sendTo = offer.candidateEmail?.toLowerCase() || workEmail;
        }
        if (!sendTo || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sendTo)) {
            return NextResponse.json(
                { error: "Recipient email is required (often the candidate's personal email)" },
                { status: 400 }
            );
        }

        const { user, created } = await ensurePortalUserForOnboarding({
            offer,
            workEmail,
            password,
            signedName: offer.signedName,
        });

        const employmentType = resolveOfferEmploymentType(offer);
        const isIntern = isInternEmploymentType(employmentType);

        const result = await sendNuriekOnboardingEmail({
            to: sendTo,
            recipientName: offer.signedName || offer.candidateName,
            workEmail,
            password,
            position: offer.position,
            department: offer.department || "Nuriek",
            isIntern,
            refNumber: offer.refNumber,
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
                onboardingEmailedAt: new Date(),
                onboardingWorkEmail: workEmail,
                candidateEmail: offer.candidateEmail || workEmail,
            },
        });

        await logAudit({
            actorId: actor.id,
            actorEmail: actor.email,
            action: "OFFER_ONBOARDING_SENT",
            entity: "OfferLetter",
            entityId: offer.id,
            metadata: {
                ref: offer.refNumber,
                sentTo: sendTo,
                workEmail,
                userId: user.id,
                created,
            },
        });

        return NextResponse.json({
            success: true,
            sentTo: sendTo,
            workEmail,
            userId: user.id,
            profileUrl: `/profile/${user.id}`,
            created,
        });
    } catch (error) {
        console.error("Onboarding send error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to send onboarding" },
            { status: 500 }
        );
    }
}
