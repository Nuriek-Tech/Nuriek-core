import path from "path";
import fs from "fs";

export const UPLOAD_DIR = path.join(process.cwd(), "storage", "uploads");

export function toFileApiUrl(filename: string): string {
    return `/api/files/${encodeURIComponent(filename)}`;
}

export function sanitizeFilename(name: string): string {
    return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export function buildStoredFilename(originalName: string): string {
    return `${Date.now()}-${sanitizeFilename(originalName.replace(/\s+/g, "_"))}`;
}

/** Resolve a document URL to an on-disk path (new storage + legacy public/uploads). */
export function resolveUploadPath(url: string): string | null {
    if (url.startsWith("/api/files/")) {
        const encoded = url.slice("/api/files/".length);
        const filename = decodeURIComponent(encoded);
        const resolved = path.resolve(UPLOAD_DIR, filename);
        if (!resolved.startsWith(UPLOAD_DIR)) return null;
        return resolved;
    }

    if (url.startsWith("/uploads/")) {
        const legacy = path.join(process.cwd(), "public", url);
        return fs.existsSync(legacy) ? legacy : null;
    }

    return null;
}

export function isProtectedFileUrl(url: string): boolean {
    return url.startsWith("/api/files/") || url.startsWith("/uploads/");
}
