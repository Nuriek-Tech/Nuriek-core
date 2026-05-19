import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ADMIN_ROLES } from "@/lib/constants";
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
        const body = await req.json();

        const existing = await prisma.document.findUnique({ where: { id } });
        if (!existing || existing.type === "DRIVE") {
            return NextResponse.json({ error: "Document not found" }, { status: 404 });
        }

        const { title, description, type, url, status } = body;
        const data: {
            title?: string;
            description?: string | null;
            type?: string;
            url?: string;
            status?: string;
            updatedAt: Date;
        } = { updatedAt: new Date() };

        if (typeof title === "string" && title.trim()) data.title = title.trim();
        if (description !== undefined) data.description = description ? String(description) : null;
        if (typeof type === "string" && ["LEGAL", "POLICY", "EMPLOYEE"].includes(type)) data.type = type;
        if (typeof url === "string" && url.trim()) data.url = url.trim();
        if (typeof status === "string" && ["PENDING", "PARTIALLY_SIGNED", "COMPLETED"].includes(status)) {
            data.status = status;
        }

        const doc = await prisma.document.update({
            where: { id },
            data,
            include: { requiredSigners: true },
        });

        await logAudit({
            actorId: user.id,
            actorEmail: user.email,
            action: "DOCUMENT_UPLOAD",
            entity: "Document",
            entityId: id,
            metadata: { title: doc.title, action: "edit" },
        });

        return NextResponse.json(doc);
    } catch (error) {
        console.error("Document update error:", error);
        return NextResponse.json({ error: "Failed to update document" }, { status: 500 });
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
        const { id } = await props.params;

        const doc = await prisma.document.findUnique({ where: { id } });
        if (!doc || doc.type === "DRIVE") {
            return NextResponse.json({ error: "Document not found" }, { status: 404 });
        }

        const filePath = resolveUploadPath(doc.url);
        if (filePath) {
            try {
                await unlink(filePath);
            } catch {
                // File may already be removed
            }
        }

        await prisma.document.delete({ where: { id } });

        await logAudit({
            actorId: user.id,
            actorEmail: user.email,
            action: "DOCUMENT_DELETE",
            entity: "Document",
            entityId: id,
            metadata: { title: doc.title, type: doc.type },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Document delete error:", error);
        return NextResponse.json({ error: "Failed to delete document" }, { status: 500 });
    }
}
