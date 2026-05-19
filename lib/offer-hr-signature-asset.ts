import fs from "fs";
import path from "path";

export const HR_SIGNATURE_FILE = "nuriek-hr-signature.png";

const MAX_SIGNATURE_BYTES = 600 * 1024;

function signatureFilePath(): string {
    return path.join(process.cwd(), "public", "images", HR_SIGNATURE_FILE);
}

/** Base64 data URL from public/images/nuriek-hr-signature.png (committed or uploaded on deploy). */
let cachedDiskDataUrl: string | null | undefined;

export function loadHrSignatureDataUrlFromDisk(): string | null {
    if (cachedDiskDataUrl !== undefined) return cachedDiskDataUrl;

    const filePath = signatureFilePath();
    if (!fs.existsSync(filePath)) {
        cachedDiskDataUrl = null;
        return null;
    }

    const buf = fs.readFileSync(filePath);
    if (buf.length > MAX_SIGNATURE_BYTES) {
        console.warn(`[offer] HR signature file too large (${buf.length} bytes): ${filePath}`);
        cachedDiskDataUrl = null;
        return null;
    }

    const ext = path.extname(filePath).toLowerCase();
    const mime =
        ext === ".jpg" || ext === ".jpeg"
            ? "image/jpeg"
            : ext === ".webp"
              ? "image/webp"
              : "image/png";

    cachedDiskDataUrl = `data:${mime};base64,${buf.toString("base64")}`;
    return cachedDiskDataUrl;
}

export function isValidHrSignatureDataUrl(value: string | null | undefined): boolean {
    const v = value?.trim();
    if (!v) return false;
    if (!v.startsWith("data:image/")) return false;
    return v.length <= MAX_SIGNATURE_BYTES * 1.4;
}
