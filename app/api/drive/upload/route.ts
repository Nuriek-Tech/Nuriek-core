import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendDocumentNotification } from "@/lib/mail";
import { ROLES, ADMIN_ROLES } from "@/lib/constants";
import { requireRoles, isNextResponse } from "@/lib/rbac";
import { buildStoredFilename, toFileApiUrl, UPLOAD_DIR } from "@/lib/files";
import { logAudit } from "@/lib/audit";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function POST(req: NextRequest) {
    const user = await requireRoles(ADMIN_ROLES);
    if (isNextResponse(user)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const formData = await req.formData();
        const file = formData.get("file") as File;
        const title = formData.get("title") as string;
        const description = formData.get("description") as string;
        const category = formData.get("category") as string;
        const notify = formData.get("notify") === "true";

        if (!file || !title) {
            return NextResponse.json({ error: "Missing file or title" }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const filename = buildStoredFilename(file.name);
        await mkdir(UPLOAD_DIR, { recursive: true });

        const filepath = path.join(UPLOAD_DIR, filename);
        await writeFile(filepath, buffer);

        const fileUrl = toFileApiUrl(filename);

        const doc = await prisma.document.create({
            data: {
                title,
                description,
                url: fileUrl,
                type: "DRIVE",
                category: category || "General",
                size: file.size,
                allowedRoles: "ALL",
                status: "PUBLISHED",
            },
        });

        await logAudit({
            actorId: user.id,
            actorEmail: user.email,
            action: "DOCUMENT_UPLOAD",
            entity: "Document",
            entityId: doc.id,
            metadata: { title },
        });

        if (notify) {
            const users = await prisma.user.findMany({
                where: {
                    role: {
                        in: [
                            ROLES.EMPLOYEE,
                            ROLES.INTERN,
                            ROLES.MANAGER,
                            ROLES.TEAM_LEAD,
                        ],
                    },
                    email: { not: null },
                },
                select: { email: true },
            });

            const recipients = users.map((u) => u.email).filter(Boolean) as string[];
            if (recipients.length > 0) {
                sendDocumentNotification(title, fileUrl, recipients).catch(console.error);
            }
        }

        return NextResponse.json(doc);
    } catch (error) {
        console.error("Upload error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
