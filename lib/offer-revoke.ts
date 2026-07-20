import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { OFFER_STATUS, computeOfferStatus, offerStatusLabel } from "@/lib/offer-letter-workflow";
import { resolveOfferEmploymentType } from "@/lib/offer-letter";
import { HR_TEAM_EMAILS } from "@/lib/hr-permissions";
import { sendOfferRevokeNotifications } from "@/lib/mail";

export type RevokeOfferResult =
    | {
          ok: true;
          offer: {
              id: string;
              refNumber: string;
              candidateName: string;
              revokedAt: Date;
          };
          emails: { candidate: boolean; hr: string[] };
      }
    | { ok: false; error: string; status: number };

export async function revokeOfferLetter(params: {
    offerId: string;
    revokedById: string;
    revokedByEmail?: string | null;
    revokedByName?: string | null;
    reason?: string | null;
}): Promise<RevokeOfferResult> {
    const reason = params.reason?.trim().slice(0, 500) || null;

    const offer = await prisma.offerLetter.findUnique({
        where: { id: params.offerId },
        include: {
            createdBy: { select: { id: true, name: true, email: true } },
            provisionedUser: { select: { id: true, email: true, name: true } },
        },
    });

    if (!offer) {
        return { ok: false, error: "Offer not found", status: 404 };
    }

    if (offer.revokedAt || offer.status === OFFER_STATUS.REVOKED) {
        return { ok: false, error: "This offer was already revoked", status: 409 };
    }

    if (offer.declinedAt || offer.status === OFFER_STATUS.DECLINED) {
        return {
            ok: false,
            error: "Cannot revoke an offer the candidate already declined",
            status: 409,
        };
    }

    const previousStatus = offerStatusLabel(computeOfferStatus(offer));
    const wasSigned = Boolean(offer.signedAt || offer.status === OFFER_STATUS.SIGNED);

    const updated = await prisma.offerLetter.update({
        where: { id: offer.id },
        data: {
            status: OFFER_STATUS.REVOKED,
            revokedAt: new Date(),
            revokedById: params.revokedById,
            revokeReason: reason,
        },
    });

    const employmentType = resolveOfferEmploymentType(offer);
    const hrRecipients = new Set<string>(
        HR_TEAM_EMAILS.map((e) => e.toLowerCase())
    );
    if (offer.createdBy?.email) {
        hrRecipients.add(offer.createdBy.email.toLowerCase());
    }
    if (params.revokedByEmail) {
        hrRecipients.add(params.revokedByEmail.toLowerCase());
    }

    const emailResult = await sendOfferRevokeNotifications({
        candidateEmail: offer.candidateEmail,
        candidateName: offer.candidateName,
        position: offer.position,
        department: offer.department,
        refNumber: offer.refNumber,
        employmentType,
        revokeReason: reason,
        revokedByName: params.revokedByName,
        wasSigned,
        previousStatus,
        provisionedEmail: offer.provisionedUser?.email,
        hrRecipients: [...hrRecipients],
    });

    await logAudit({
        actorId: params.revokedById,
        actorEmail: params.revokedByEmail,
        action: "OFFER_REVOKED",
        entity: "OfferLetter",
        entityId: offer.id,
        metadata: {
            ref: offer.refNumber,
            candidate: offer.candidateName,
            previousStatus,
            wasSigned,
            reason,
            emails: emailResult,
        },
    });

    return {
        ok: true,
        offer: {
            id: updated.id,
            refNumber: updated.refNumber,
            candidateName: updated.candidateName,
            revokedAt: updated.revokedAt!,
        },
        emails: {
            candidate: emailResult.candidateSent,
            hr: emailResult.hrSentTo,
        },
    };
}
