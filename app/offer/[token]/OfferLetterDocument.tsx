"use client";

import { useMemo } from "react";
import { prepareOfferHtmlForDisplay } from "@/lib/offer-html-display";

type Props = {
    html: string;
    className?: string;
};

/** Renders offer letter HTML in-page (avoids iframe srcDoc / chrome-error navigation bugs). */
export default function OfferLetterDocument({ html, className = "" }: Props) {
    const { styles, body } = useMemo(() => prepareOfferHtmlForDisplay(html), [html]);

    return (
        <div
            className={`offerViewDoc ${className}`.trim()}
            onClick={(e) => {
                const anchor = (e.target as HTMLElement).closest("a[data-offer-link]");
                if (anchor) e.preventDefault();
            }}
        >
            {styles ? <style dangerouslySetInnerHTML={{ __html: styles }} /> : null}
            <div className="offerViewDocInner" dangerouslySetInnerHTML={{ __html: body }} />
        </div>
    );
}
