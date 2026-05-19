import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { requireSession, isNextResponse } from "@/lib/rbac";
import { UPLOAD_DIR } from "@/lib/files";

export async function GET(
    _req: NextRequest,
    props: { params: Promise<{ filename: string }> }
) {
    const session = await requireSession();
    if (isNextResponse(session)) return session;

    const { filename } = await props.params;
    const safeName = path.basename(decodeURIComponent(filename));
    const filePath = path.resolve(UPLOAD_DIR, safeName);

    if (!filePath.startsWith(UPLOAD_DIR)) {
        return new NextResponse("Forbidden", { status: 403 });
    }

    try {
        const buffer = await readFile(filePath);
        const ext = path.extname(safeName).toLowerCase();
        const contentType =
            ext === ".pdf"
                ? "application/pdf"
                : ext === ".png"
                  ? "image/png"
                  : ext === ".jpg" || ext === ".jpeg"
                    ? "image/jpeg"
                    : "application/octet-stream";

        return new NextResponse(buffer, {
            headers: {
                "Content-Type": contentType,
                "Cache-Control": "private, no-store",
            },
        });
    } catch {
        return new NextResponse("Not Found", { status: 404 });
    }
}
