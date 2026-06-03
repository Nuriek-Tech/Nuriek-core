import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin, isNextResponse } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { isOfferRefNumber } from "@/lib/offer-letter-delete";

/** Delete multiple or all offer letters (Super Admin only — for clearing test data). */
export async function POST(req: Request) {
    const superAdmin = await requireSuperAdmin();
    if (isNextResponse(superAdmin)) return superAdmin;

    try {
        const body = await req.json();
        const ids = body.ids as string[] | undefined;
        const refNumbers = body.refNumbers as string[] | undefined;
        const deleteAll = body.deleteAll === true;
        const confirm = body.confirm as string | undefined;

        if (deleteAll) {
            if (confirm !== "DELETE ALL OFFERS") {
                return NextResponse.json(
                    {
                        error: 'Type confirm exactly: "DELETE ALL OFFERS"',
                        code: "CONFIRM_REQUIRED",
                    },
                    { status: 400 }
                );
            }
            const { count } = await prisma.offerLetter.deleteMany({});
            await logAudit({
                actorId: superAdmin.id,
                actorEmail: superAdmin.email,
                action: "OFFER_PURGE_ALL",
                entity: "OfferLetter",
                metadata: { count },
            });
            return NextResponse.json({ ok: true, deletedCount: count });
        }

        const refList = (refNumbers ?? []).map((r) => String(r).trim()).filter(Boolean);
        const idList = (ids ?? []).map((r) => String(r).trim()).filter(Boolean);

        if (!idList.length && !refList.length) {
            return NextResponse.json(
                { error: "Provide ids[], refNumbers[], or deleteAll: true" },
                { status: 400 }
            );
        }

        const where =
            idList.length && refList.length
                ? {
                      OR: [
                          { id: { in: idList } },
                          { refNumber: { in: refList } },
                      ],
                  }
                : idList.length
                  ? { id: { in: idList } }
                  : { refNumber: { in: refList } };

        const targetIds = await prisma.offerLetter.findMany({
            where,
            select: { id: true },
        });
        const offerIds = targetIds.map((o) => o.id);

        if (offerIds.length === 0) {
            return NextResponse.json(
                { error: "No matching offers found", code: "NOT_FOUND" },
                { status: 404 }
            );
        }

        await prisma.internPerformance.updateMany({
            where: { conversionOfferLetterId: { in: offerIds } },
            data: { conversionOfferLetterId: null },
        });

        const { count } = await prisma.offerLetter.deleteMany({
            where: { id: { in: offerIds } },
        });

        await logAudit({
            actorId: superAdmin.id,
            actorEmail: superAdmin.email,
            action: "OFFER_PURGE",
            entity: "OfferLetter",
            metadata: {
                ids: idList,
                refNumbers: refList.filter(isOfferRefNumber),
                count,
            },
        });

        return NextResponse.json({ ok: true, deletedCount: count });
    } catch (error) {
        console.error("Offer purge:", error);
        return NextResponse.json({ error: "Failed to purge offers" }, { status: 500 });
    }
}
