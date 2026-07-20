import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getOfferDisplayHtmlHydrated, OFFER_STATUS } from "@/lib/offer-letter-workflow";
import { isInternEmploymentType, resolveOfferEmploymentType } from "@/lib/offer-letter";
import OfferViewClient from "./OfferViewClient";
import "./offer-view.css";

type Props = { params: Promise<{ token: string }> };

export default async function OfferLetterViewPage({ params }: Props) {
    const { token } = await params;

    const offer = await prisma.offerLetter.findUnique({ where: { token } });
    if (!offer) notFound();

    const isRevoked =
        offer.status === OFFER_STATUS.REVOKED || Boolean(offer.revokedAt);

    if (isRevoked) {
        const isIntern = isInternEmploymentType(resolveOfferEmploymentType(offer));
        return (
            <main className="offerViewPage">
                <div className="offerViewCard offerViewCard--revoked">
                    <h1>{isIntern ? "Internship offer withdrawn" : "Offer withdrawn"}</h1>
                    <p>
                        This offer (<strong>{offer.refNumber}</strong>) is no longer valid. HR has
                        withdrawn it
                        {offer.revokedAt
                            ? ` on ${offer.revokedAt.toLocaleString("en-IN")}`
                            : ""}
                        .
                    </p>
                    {offer.revokeReason && (
                        <p className="offerViewRevokeReason">
                            <strong>Note from HR:</strong> {offer.revokeReason}
                        </p>
                    )}
                    <p>
                        If you have questions, contact{" "}
                        <a href="mailto:hr@nuriek.com">hr@nuriek.com</a>.
                    </p>
                    <Link href="/login" className="offerViewLink">
                        Sign in to Nuriek Core
                    </Link>
                </div>
            </main>
        );
    }

    if (
        offer.expiresAt &&
        offer.expiresAt < new Date() &&
        offer.status !== OFFER_STATUS.SIGNED &&
        offer.status !== OFFER_STATUS.DECLINED &&
        !offer.declinedAt
    ) {
        return (
            <main className="offerViewPage">
                <div className="offerViewCard">
                    <h1>Offer expired</h1>
                    <p>This offer letter is no longer available. Please contact HR at hr@nuriek.com.</p>
                    <Link href="/login" className="offerViewLink">
                        Sign in to Nuriek Core
                    </Link>
                </div>
            </main>
        );
    }

    const displayHtml = await getOfferDisplayHtmlHydrated(offer);
    const isSigned = offer.status === OFFER_STATUS.SIGNED || Boolean(offer.signedAt);
    const isDeclined =
        offer.status === OFFER_STATUS.DECLINED || Boolean(offer.declinedAt);
    const isIntern = isInternEmploymentType(resolveOfferEmploymentType(offer));

    return (
        <OfferViewClient
            html={displayHtml}
            candidateName={offer.candidateName}
            token={token}
            isSigned={isSigned}
            isDeclined={isDeclined}
            signedAt={offer.signedAt?.toISOString() ?? null}
            declinedAt={offer.declinedAt?.toISOString() ?? null}
            declineReason={offer.declineReason}
            isIntern={isIntern}
        />
    );
}
