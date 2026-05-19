/** Prepare stored offer letter HTML for embedding in the public offer page (no iframe). */

export type OfferHtmlParts = {
    styles: string;
    body: string;
};

export function parseOfferHtmlForDisplay(fullHtml: string): OfferHtmlParts {
    const styleMatch = fullHtml.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
    const bodyMatch = fullHtml.match(/<body[^>]*>([\s\S]*)<\/body>/i);
    return {
        styles: styleMatch?.[1]?.trim() ?? "",
        body: bodyMatch?.[1]?.trim() ?? fullHtml,
    };
}

/** Remove controls that break when embedded or navigate the parent offer URL inside a frame. */
export function sanitizeOfferBodyHtml(bodyHtml: string): string {
    let html = bodyHtml;
    html = html.replace(/<button[^>]*class="print-btn"[^>]*>[\s\S]*?<\/button>/gi, "");
    html = html.replace(/\sonclick="[^"]*"/gi, "");
    html = html.replace(/<base\b[^>]*>/gi, "");
    html = html.replace(
        /<a\b([^>]*)\bhref\s*=\s*["'](?!mailto:|tel:|#)([^"']*)["']/gi,
        '<a$1 href="#" data-offer-link="$2"'
    );
    return html;
}

export function prepareOfferHtmlForDisplay(fullHtml: string): OfferHtmlParts {
    const { styles, body } = parseOfferHtmlForDisplay(fullHtml);
    return {
        styles,
        body: sanitizeOfferBodyHtml(body),
    };
}
