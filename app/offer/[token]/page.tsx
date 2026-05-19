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

    if (offer.expiresAt && offer.expiresAt < new Date() && offer.status !== OFFER_STATUS.SIGNED) {
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
    const isIntern = isInternEmploymentType(resolveOfferEmploymentType(offer));

    return (
        <OfferViewClient
            html={displayHtml}
            candidateName={offer.candidateName}
            token={token}
            isSigned={isSigned}
            signedAt={offer.signedAt?.toISOString() ?? null}
            isIntern={isIntern}
        />
    );
}
