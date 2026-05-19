import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ADMIN_ROLES } from "@/lib/constants";
import { requireRoles, isNextResponse } from "@/lib/rbac";
import { buildStoredFilename, toFileApiUrl, UPLOAD_DIR } from "@/lib/files";
import { logAudit } from "@/lib/audit";
import { sendSignatureRequestEmail } from "@/lib/mail";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

type SignerInput = {
    email: string;
    userId?: string | null;
    role?: string;
};

export async function POST(req: NextRequest) {
    const user = await requireRoles(ADMIN_ROLES);
    if (isNextResponse(user)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const formData = await req.formData();
        const file = formData.get("file") as File | null;
        const title = formData.get("title") as string;
        const description = (formData.get("description") as string) || "";
        const type = (formData.get("type") as string) || "LEGAL";
        const signersRaw = formData.get("signers") as string;

        if (!file || !title) {
            return NextResponse.json({ error: "Missing file or title" }, { status: 400 });
        }

        const signerList: SignerInput[] = signersRaw ? JSON.parse(signersRaw) : [];
        if (signerList.length === 0) {
            return NextResponse.json({ error: "At least one signer is required" }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const filename = buildStoredFilename(file.name);
        await mkdir(UPLOAD_DIR, { recursive: true });
        await writeFile(path.join(UPLOAD_DIR, filename), buffer);

        const fileUrl = toFileApiUrl(filename);

        const document = await prisma.document.create({
            data: {
                title,
                description,
                url: fileUrl,
                type,
                size: file.size,
                allowedRoles: "ALL",
                status: "PENDING",
                requiredSigners: {
                    create: signerList.map((s, idx) => ({
                        email: s.email,
                        userId: s.userId || null,
                        role: s.role || "SIGNER",
                        order: idx,
                    })),
                },
            },
            include: { requiredSigners: true },
        });

        await logAudit({
            actorId: user.id,
            actorEmail: user.email,
            action: "DOCUMENT_UPLOAD",
            entity: "Document",
            entityId: document.id,
            metadata: { title, signers: signerList.length },
        });

        const emailResults = await Promise.all(
            signerList.map(async (s) => {
                const result = await sendSignatureRequestEmail({
                    to: s.email,
                    documentTitle: title,
                    description,
                    signerRole: s.role,
                });
                return { email: s.email, ...result };
            })
        );
        const emailsSent = emailResults.filter((r) => r.success).length;
        const emailFailures = emailResults.filter((r) => !r.success);

        return NextResponse.json({
            ...document,
            emailsSent,
            emailFailures,
            emailConfigured: Boolean(process.env.ZOHO_USER && process.env.ZOHO_PASSWORD),
        });
    } catch (error) {
        console.error("Document upload error:", error);
        return NextResponse.json({ error: "Failed to issue document" }, { status: 500 });
    }
}
