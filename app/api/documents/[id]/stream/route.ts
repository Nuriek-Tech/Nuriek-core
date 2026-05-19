import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { requireSession, isNextResponse } from "@/lib/rbac";
import { userCanAccessDocument } from "@/lib/document-access";
import { UPLOAD_DIR } from "@/lib/files";

async function loadDocumentBytes(url: string): Promise<Buffer | null> {
    if (url.startsWith("/api/files/")) {
        const filename = decodeURIComponent(url.replace("/api/files/", ""));
        const safeName = path.basename(filename);
        const filePath = path.resolve(UPLOAD_DIR, safeName);
        if (!filePath.startsWith(UPLOAD_DIR)) return null;
        try {
            return await readFile(filePath);
        } catch {
            return null;
        }
    }

    if (url.startsWith("http://") || url.startsWith("https://")) {
        const res = await fetch(url);
        if (!res.ok) return null;
        return Buffer.from(await res.arrayBuffer());
    }

    return null;
}

export async function GET(
    _req: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    const sessionUser = await requireSession();
    if (isNextResponse(sessionUser)) return sessionUser;

    const { id } = await props.params;
    const doc = await userCanAccessDocument(sessionUser, id);
    if (!doc) {
        return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    const buffer = await loadDocumentBytes(doc.url);
    if (!buffer) {
        return NextResponse.json({ error: "Unable to load document file" }, { status: 502 });
    }

    return new NextResponse(new Uint8Array(buffer), {
        headers: {
            "Content-Type": "application/pdf",
            "Cache-Control": "private, no-store",
            "Content-Disposition": `inline; filename="${encodeURIComponent(doc.title)}.pdf"`,
        },
    });
}
