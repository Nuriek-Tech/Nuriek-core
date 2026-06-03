import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireHrPermission, isNextResponse } from "@/lib/rbac";
import { computeOfferStatus, offerStatusLabel } from "@/lib/offer-letter-workflow";

export async function GET(req: Request) {
    const user = await requireHrPermission("offer_letter");
    if (isNextResponse(user)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { searchParams } = new URL(req.url);
        const ref = searchParams.get("ref")?.trim();
        const q = searchParams.get("q")?.trim();

        const offers = await prisma.offerLetter.findMany({
            where: ref
                ? { refNumber: ref }
                : q
                  ? {
                        OR: [
                            { refNumber: { contains: q, mode: "insensitive" } },
                            { candidateName: { contains: q, mode: "insensitive" } },
                            { candidateEmail: { contains: q, mode: "insensitive" } },
                        ],
                    }
                  : undefined,
            orderBy: { createdAt: "desc" },
            take: ref ? 5 : 150,
            select: {
                id: true,
                token: true,
                refNumber: true,
                candidateName: true,
                candidateEmail: true,
                position: true,
                department: true,
                employmentType: true,
                internshipType: true,
                internshipMonths: true,
                status: true,
                emailedAt: true,
                viewedAt: true,
                signedAt: true,
                signedName: true,
                declinedAt: true,
                declineReason: true,
                expiresAt: true,
                provisionedUserId: true,
                provisionedAt: true,
                onboardingEmailedAt: true,
                onboardingWorkEmail: true,
                createdAt: true,
                createdBy: { select: { name: true } },
                provisionedUser: {
                    select: { id: true, email: true, name: true, role: true },
                },
            },
        });

        return NextResponse.json({
            offers: offers.map((o) => {
                const status = computeOfferStatus(o);
                return {
                    ...o,
                    status,
                    statusLabel: offerStatusLabel(status),
                    offerUrl: `/offer/${o.token}`,
                };
            }),
        });
    } catch (error) {
        console.error("Offer list error:", error);
        return NextResponse.json({ error: "Failed to load offers" }, { status: 500 });
    }
}
