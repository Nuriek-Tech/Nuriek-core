/** Client-safe HR signature validation (no Node fs). */

export const MAX_HR_SIGNATURE_BYTES = 600 * 1024;

export function hrSignatureDataUrlByteLength(value: string): number {
    const comma = value.indexOf(",");
    if (comma === -1) return value.length;
    const b64 = value.slice(comma + 1);
    if (typeof Buffer !== "undefined") {
        return Buffer.byteLength(b64, "base64");
    }
    const padding = b64.endsWith("==") ? 2 : b64.endsWith("=") ? 1 : 0;
    return Math.floor((b64.length * 3) / 4) - padding;
}

export function isValidHrSignatureDataUrl(value: string | null | undefined): boolean {
    const v = value?.trim();
    if (!v) return false;
    if (!v.startsWith("data:image/")) return false;
    try {
        return hrSignatureDataUrlByteLength(v) <= MAX_HR_SIGNATURE_BYTES;
    } catch {
        return false;
    }
}
