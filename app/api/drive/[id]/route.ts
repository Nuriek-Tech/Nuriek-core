import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ADMIN_ROLES, DRIVE_CATEGORIES } from "@/lib/constants";
import { requireRoles, isNextResponse } from "@/lib/rbac";
import { resolveUploadPath } from "@/lib/files";
import { logAudit } from "@/lib/audit";
import { unlink } from "fs/promises";

export async function PATCH(
    req: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    const user = await requireRoles(ADMIN_ROLES);
    if (isNextResponse(user)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { id } = await props.params;
        const { category } = await req.json();

        if (!category || typeof category !== "string") {
            return NextResponse.json({ error: "Folder name is required" }, { status: 400 });
        }

        const trimmed = category.trim();
        const allowed = DRIVE_CATEGORIES as readonly string[];
        if (!allowed.includes(trimmed)) {
            return NextResponse.json(
                { error: `Invalid folder. Choose one of: ${allowed.join(", ")}` },
                { status: 400 }
            );
        }

        const existing = await prisma.document.findUnique({ where: { id } });
        if (!existing || existing.type !== "DRIVE") {
            return NextResponse.json({ error: "Drive file not found" }, { status: 404 });
        }

        const doc = await prisma.document.update({
            where: { id },
            data: { category: trimmed, updatedAt: new Date() },
        });

        await logAudit({
            actorId: user.id,
            actorEmail: user.email,
            action: "DOCUMENT_UPLOAD",
            entity: "Document",
            entityId: id,
            metadata: { title: doc.title, from: existing.category, to: trimmed, action: "move" },
        });

        return NextResponse.json(doc);
    } catch (error) {
        console.error("Move file error:", error);
        return NextResponse.json({ error: "Failed to move file" }, { status: 500 });
    }
}

export async function DELETE(
    _req: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    const user = await requireRoles(ADMIN_ROLES);
    if (isNextResponse(user)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { id: documentId } = await props.params;

        const doc = await prisma.document.findUnique({
            where: { id: documentId },
        });

        if (!doc) {
            return NextResponse.json({ error: "Document not found" }, { status: 404 });
        }

        if (doc.type === "DRIVE") {
            const filePath = resolveUploadPath(doc.url);
            if (filePath) {
                try {
                    await unlink(filePath);
                } catch {
                    // File may already be removed
                }
            }
        }

        await prisma.document.delete({ where: { id: documentId } });

        await logAudit({
            actorId: user.id,
            actorEmail: user.email,
            action: "DOCUMENT_DELETE",
            entity: "Document",
            entityId: documentId,
            metadata: { title: doc.title },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Delete error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
