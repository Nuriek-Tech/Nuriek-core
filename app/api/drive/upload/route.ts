
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendDocumentNotification } from "@/lib/mail";
import { ROLES } from "@/lib/constants";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || ![ROLES.FOUNDER, ROLES.HR_ADMIN].includes((session.user as any)?.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const formData = await req.formData();
        const file = formData.get("file") as File;
        const title = formData.get("title") as string;
        const description = formData.get("description") as string;
        const category = formData.get("category") as string;
        const notify = formData.get("notify") === "true";

        if (!file || !title) {
            return NextResponse.json({ error: "Missing file or title" }, { status: 400 });
        }

        // 1. Save File Locally
        const buffer = Buffer.from(await file.arrayBuffer());
        const filename = `${Date.now()}-${file.name.replace(/\s+/g, '_')}`;
        const uploadDir = path.join(process.cwd(), "public/uploads");

        try {
            await mkdir(uploadDir, { recursive: true });
        } catch (e) {
            // Ignore if exists
        }

        const filepath = path.join(uploadDir, filename);
        await writeFile(filepath, buffer);

        const fileUrl = `/uploads/${filename}`;

        // 2. Create Database Record
        const doc = await prisma.document.create({
            data: {
                title,
                description,
                url: fileUrl,
                type: "DRIVE",
                category: category || "General",
                size: file.size,
                allowedRoles: "ALL", // Default to shared with everyone for now
                status: "PUBLISHED",
            },
        });

        // 3. Send Notifications
        if (notify) {
            // Fetch all active employees/interns
            const users = await prisma.user.findMany({
                where: {
                    role: { in: [ROLES.EMPLOYEE, ROLES.INTERN, ROLES.MANAGER, ROLES.TEAM_LEAD] },
                    email: { not: null } // Ensure they have an email
                },
                select: { email: true }
            });

            const recipients = users.map(u => u.email).filter(Boolean) as string[];

            if (recipients.length > 0) {
                // Fire and forget email to avoid blocking response
                sendDocumentNotification(title, fileUrl, recipients).catch(console.error);
            }
        }

        return NextResponse.json(doc);

    } catch (error) {
        console.error("Upload error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
