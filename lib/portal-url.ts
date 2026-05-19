/** Production Nuriek Core portal (apex — www.core.nuriek.com has no DNS unless you add it). */
export const NURIEK_PORTAL_URL = "https://core.nuriek.com";

function isLocalDevUrl(url: string): boolean {
    return /localhost|127\.0\.0\.1/i.test(url);
}

function normalizeBase(url: string): string {
    return url.trim().replace(/\/$/, "");
}

/**
 * Base URL for links in outbound emails (onboarding, offers, etc.).
 * Never uses localhost — candidates must get a real public URL.
 */
export function portalEmailBaseUrl(): string {
    const candidates = [
        process.env.PORTAL_PUBLIC_URL,
        process.env.EMAIL_PUBLIC_URL,
        process.env.NEXT_PUBLIC_APP_URL,
        process.env.NEXTAUTH_URL,
    ].filter((v): v is string => Boolean(v?.trim()));

    for (const raw of candidates) {
        const base = normalizeBase(raw);
        if (!isLocalDevUrl(base)) return base;
    }

    return NURIEK_PORTAL_URL;
}

export function portalEmailUrl(path = ""): string {
    const base = portalEmailBaseUrl();
    if (!path) return base;
    return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

/** In-app / server links (may use localhost in development). */
export function portalAppBaseUrl(): string {
    const raw =
        process.env.NEXTAUTH_URL ||
        process.env.NEXT_PUBLIC_APP_URL ||
        process.env.PORTAL_PUBLIC_URL ||
        NURIEK_PORTAL_URL;
    return normalizeBase(raw);
}

export function portalAppUrl(path = ""): string {
    const base = portalAppBaseUrl();
    if (!path) return base;
    return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}
