import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireHrPermission, isNextResponse } from "@/lib/rbac";
import {
    buildNuriekOnboardingEmailHtml,
    nuriekOnboardingEmailSubject,
} from "@/lib/nuriek-onboarding-email";
import { resolveOfferEmploymentType, isInternEmploymentType } from "@/lib/offer-letter";
import { isNuriekWorkEmail, normalizeWorkEmail } from "@/lib/email-policy";
import { portalEmailUrl } from "@/lib/portal-url";

export async function POST(req: Request) {
    const user = await requireHrPermission("offer_letter");
    if (isNextResponse(user)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await req.json();
        const token = String(body.token || "").trim();
        const workEmail = String(body.workEmail || "").trim();
        const password = String(body.password || "").trim() || "••••••••••••";

        if (!token) {
            return NextResponse.json({ error: "Offer token is required" }, { status: 400 });
        }

        const offer = await prisma.offerLetter.findUnique({ where: { token } });
        if (!offer) {
            return NextResponse.json({ error: "Offer not found" }, { status: 404 });
        }

        if (offer.status !== "SIGNED" && !offer.signedAt) {
            return NextResponse.json(
                { error: "Offer must be signed before sending onboarding" },
                { status: 400 }
            );
        }

        const emailForPreview =
            workEmail && isNuriekWorkEmail(workEmail)
                ? normalizeWorkEmail(workEmail)
                : offer.candidateEmail && isNuriekWorkEmail(offer.candidateEmail)
                  ? normalizeWorkEmail(offer.candidateEmail)
                  : "name@nuriek.com";

        const employmentType = resolveOfferEmploymentType(offer);
        const isIntern = isInternEmploymentType(employmentType);

        const emailHtml = buildNuriekOnboardingEmailHtml(
            {
                recipientName: offer.signedName || offer.candidateName,
                workEmail: emailForPreview,
                password,
                loginUrl: portalEmailUrl("/login"),
                position: offer.position,
                department: offer.department || "Nuriek",
                isIntern,
                refNumber: offer.refNumber,
            },
            "preview"
        );

        return NextResponse.json({
            emailHtml,
            subject: nuriekOnboardingEmailSubject(isIntern),
            suggestedTo:
                offer.candidateEmail ||
                offer.onboardingWorkEmail ||
                (offer.candidateEmail?.includes("@") ? offer.candidateEmail : ""),
            defaultWorkEmail:
                offer.onboardingWorkEmail ||
                (offer.candidateEmail && isNuriekWorkEmail(offer.candidateEmail)
                    ? normalizeWorkEmail(offer.candidateEmail)
                    : ""),
            provisionedUserId: offer.provisionedUserId,
            onboardingEmailedAt: offer.onboardingEmailedAt,
        });
    } catch (error) {
        console.error("Onboarding preview error:", error);
        return NextResponse.json({ error: "Failed to build preview" }, { status: 500 });
    }
}
