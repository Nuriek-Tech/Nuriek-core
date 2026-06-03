import { prisma } from "@/lib/prisma";

const OFFER_REF_PREFIX = "NRK-OFR-";

export function isOfferRefNumber(value: string): boolean {
    return value.trim().toUpperCase().startsWith(OFFER_REF_PREFIX);
}

/** Resolve offer row by Prisma id or NRK-OFR ref (for delete / admin actions). */
export async function findOfferLetterByIdOrRef(idOrRef: string) {
    const key = idOrRef.trim();
    if (!key) return null;

    const byId = await prisma.offerLetter.findUnique({
        where: { id: key },
        select: { id: true, refNumber: true, candidateName: true, status: true },
    });
    if (byId) return byId;

    if (isOfferRefNumber(key)) {
        return prisma.offerLetter.findFirst({
            where: { refNumber: key },
            select: { id: true, refNumber: true, candidateName: true, status: true },
        });
    }

    return null;
}

export async function deleteOfferLetterByIdOrRef(idOrRef: string): Promise<{
    deleted: boolean;
    refNumber?: string;
    candidateName?: string;
}> {
    const offer = await findOfferLetterByIdOrRef(idOrRef);
    if (!offer) {
        return { deleted: false };
    }

    await prisma.$transaction([
        prisma.internPerformance.updateMany({
            where: { conversionOfferLetterId: offer.id },
            data: { conversionOfferLetterId: null },
        }),
        prisma.offerLetter.delete({ where: { id: offer.id } }),
    ]);

    return {
        deleted: true,
        refNumber: offer.refNumber,
        candidateName: offer.candidateName,
    };
}
