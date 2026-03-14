
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ROLES } from "@/lib/constants";
import { unlink } from "fs/promises";
import path from "path";
import fs from "fs";

export async function DELETE(
    req: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    try {
        const params = await props.params;
        const documentId = params.id;
        const session = await getServerSession(authOptions);
        console.log("[Delete API] Session:", JSON.stringify(session, null, 2));

        if (!session?.user || ![ROLES.FOUNDER, ROLES.HR_ADMIN].includes((session.user as any).role)) {
            console.error("[Delete API] Unauthorized access attempt", session?.user);
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }



        // 1. Fetch document to get file path
        const doc = await prisma.document.findUnique({
            where: { id: documentId },
        });

        if (!doc) {
            console.error(`[Delete] Document not found: ${documentId}`);
            return NextResponse.json({ error: "Document not found" }, { status: 404 });
        }

        console.log(`[Delete] Deleting document: ${doc.title} (${doc.id})`);

        // 2. Delete file from filesystem
        if (doc.type === "DRIVE" && doc.url.startsWith("/uploads/")) {
            const filePath = path.join(process.cwd(), "public", doc.url);
            console.log(`[Delete] Removing file at: ${filePath}`);
            if (fs.existsSync(filePath)) {
                try {
                    await unlink(filePath);
                } catch (e) {
                    console.error("Failed to delete file from disk:", e);
                    // Continue to delete metadata even if file delete fails (or maybe it was already gone)
                }
            } else {
                console.warn(`[Delete] File not found on disk: ${filePath}`);
            }
        }

        // 3. Delete database record
        await prisma.document.delete({
            where: { id: documentId },
        });

        console.log(`[Delete] Success: ${documentId}`);
        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error("Delete error:", error);
        return NextResponse.json({
            error: "Internal Server Error",
            details: error?.message || String(error)
        }, { status: 500 });
    }
}
