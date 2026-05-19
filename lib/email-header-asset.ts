import fs from "fs";
import path from "path";

/** Content-ID for inline header image in Zoho / Gmail / Outlook. */
export const NURIEK_EMAIL_HEADER_CID = "nuriek-email-header@nuriek";

const HEADER_FILE = "nuriek-email-header.png";

function headerFilePath(): string {
    return path.join(process.cwd(), "public", "images", HEADER_FILE);
}

/** Nodemailer inline attachment — embeds header in the email body. */
export function nuriekEmailHeaderAttachment() {
    return {
        filename: HEADER_FILE,
        path: headerFilePath(),
        cid: NURIEK_EMAIL_HEADER_CID,
    };
}

/** Use in HTML sent via SMTP (references the CID attachment). */
export function nuriekEmailHeaderCidSrc(): string {
    return `cid:${NURIEK_EMAIL_HEADER_CID}`;
}

let previewDataUrl: string | null = null;

/** Base64 data URL for admin email preview (iframe srcDoc). */
export function nuriekEmailHeaderPreviewSrc(): string {
    if (previewDataUrl) return previewDataUrl;

    const filePath = headerFilePath();
    if (!fs.existsSync(filePath)) {
        console.warn(`[email] Header image missing: ${filePath}`);
        return "";
    }

    const buf = fs.readFileSync(filePath);
    previewDataUrl = `data:image/png;base64,${buf.toString("base64")}`;
    return previewDataUrl;
}

/** Public HTTPS URL when deployed (optional fallback). */
export function nuriekEmailHeaderPublicUrl(): string {
    const base =
        process.env.EMAIL_PUBLIC_URL ||
        process.env.NEXTAUTH_URL ||
        process.env.NEXT_PUBLIC_APP_URL ||
        "";
    const trimmed = base.replace(/\/$/, "");
    if (trimmed && !trimmed.includes("localhost") && !trimmed.includes("127.0.0.1")) {
        return `${trimmed}/images/${HEADER_FILE}`;
    }
    return nuriekEmailHeaderPreviewSrc();
}
