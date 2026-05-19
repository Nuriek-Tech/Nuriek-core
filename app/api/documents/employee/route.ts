import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, requireHrPermission, isNextResponse } from "@/lib/rbac";
import { hasAnyRole } from "@/lib/roles";
import { ADMIN_ROLES } from "@/lib/constants";
import { buildStoredFilename, toFileApiUrl, UPLOAD_DIR } from "@/lib/files";
import { logAudit } from "@/lib/audit";
import { sendSignatureRequestEmail } from "@/lib/mail";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

/** List or upload documents assigned to a specific employee. */
export async function GET(req: Request) {
    const user = await requireSession();
    if (isNextResponse(user)) return user;

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    const isAdmin = hasAnyRole(user.role, ADMIN_ROLES);
    const targetId = isAdmin && userId ? userId : user.id;

    if (!isAdmin && userId && userId !== user.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    try {
        const documents = await prisma.document.findMany({
            where: {
                type: { not: "DRIVE" },
                targetUserId: targetId,
            },
            include: {
                signatures: {
                    where: {
                        OR: [{ userId: targetId }, { email: user.email || "" }],
                    },
                },
                requiredSigners: true,
                targetUser: { select: { id: true, name: true, email: true } },
            },
            orderBy: { createdAt: "desc" },
        });

        const readRows = await prisma.documentRead.findMany({
            where: { userId: targetId, documentId: { in: documents.map((d) => d.id) } },
            select: { documentId: true, completedAt: true },
        });
        const readByDoc = new Map(readRows.map((r) => [r.documentId, r.completedAt]));

        return NextResponse.json(
            documents.map((doc) => ({
                ...doc,
                isSigned: doc.signatures.length > 0,
                hasRead: readByDoc.has(doc.id),
                readCompletedAt: readByDoc.get(doc.id) ?? null,
                signedCount: doc.requiredSigners.filter((s) => s.signedAt).length,
                totalSigners: doc.requiredSigners.length,
                isRequiredSigner: doc.requiredSigners.some(
                    (s) => s.userId === targetId || s.email === user.email
                ),
            }))
        );
    } catch (error) {
        console.error("Employee documents fetch:", error);
        return NextResponse.json({ error: "Failed to load documents" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    const actor = await requireHrPermission("employee_documents");
    if (isNextResponse(actor)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const formData = await req.formData();
        const file = formData.get("file") as File | null;
        const title = (formData.get("title") as string)?.trim();
        const description = ((formData.get("description") as string) || "").trim();
        const userId = formData.get("userId") as string;
        const requiresSignature = formData.get("requiresSignature") === "true";

        if (!file || !title || !userId) {
            return NextResponse.json(
                { error: "File, title, and employee are required" },
                { status: 400 }
            );
        }

        const employee = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, name: true, email: true },
        });
        if (!employee?.email) {
            return NextResponse.json({ error: "Employee not found" }, { status: 404 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const filename = buildStoredFilename(file.name);
        await mkdir(UPLOAD_DIR, { recursive: true });
        await writeFile(path.join(UPLOAD_DIR, filename), buffer);

        const fileUrl = toFileApiUrl(filename);

        const document = await prisma.document.create({
            data: {
                title,
                description: description || null,
                url: fileUrl,
                type: "EMPLOYEE",
                category: "EMPLOYMENT",
                size: file.size,
                targetUserId: userId,
                allowedRoles: "ALL",
                status: requiresSignature ? "PENDING" : "COMPLETED",
                requiredSigners: requiresSignature
                    ? {
                          create: [
                              {
                                  email: employee.email,
                                  userId: employee.id,
                                  role: "EMPLOYEE",
                                  order: 0,
                              },
                          ],
                      }
                    : undefined,
            },
            include: { requiredSigners: true, targetUser: { select: { id: true, name: true, email: true } } },
        });

        await logAudit({
            actorId: actor.id,
            actorEmail: actor.email,
            action: "DOCUMENT_UPLOAD",
            entity: "Document",
            entityId: document.id,
            metadata: {
                title,
                targetUserId: userId,
                flow: "employee_document",
                requiresSignature,
            },
        });

        let emailsSent = 0;
        if (requiresSignature && employee.email) {
            const result = await sendSignatureRequestEmail({
                to: employee.email,
                documentTitle: title,
                description: description || "Please review and sign your employment document in Nuriek Core.",
                signerRole: "EMPLOYEE",
            });
            if (result.success) emailsSent = 1;
        }

        return NextResponse.json({ ...document, emailsSent });
    } catch (error) {
        console.error("Employee document upload:", error);
        return NextResponse.json({ error: "Failed to upload document" }, { status: 500 });
    }
}
