import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin, isNextResponse } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";

/** Delete multiple or all offer letters (Super Admin only — for clearing test data). */
export async function POST(req: Request) {
    const superAdmin = await requireSuperAdmin();
    if (isNextResponse(superAdmin)) return superAdmin;

    try {
        const body = await req.json();
        const ids = body.ids as string[] | undefined;
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

        if (!ids?.length) {
            return NextResponse.json({ error: "Provide ids[] or deleteAll: true" }, { status: 400 });
        }

        const { count } = await prisma.offerLetter.deleteMany({
            where: { id: { in: ids } },
        });

        await logAudit({
            actorId: superAdmin.id,
            actorEmail: superAdmin.email,
            action: "OFFER_PURGE",
            entity: "OfferLetter",
            metadata: { ids, count },
        });

        return NextResponse.json({ ok: true, deletedCount: count });
    } catch (error) {
        console.error("Offer purge:", error);
        return NextResponse.json({ error: "Failed to purge offers" }, { status: 500 });
    }
}
