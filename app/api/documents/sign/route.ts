import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, isNextResponse } from "@/lib/rbac";
import {
    userCanAccessDocument,
    userMustSignDocument,
    userHasReadDocument,
} from "@/lib/document-access";

export async function POST(req: Request) {
    const sessionUser = await requireSession();
    if (isNextResponse(sessionUser)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { documentId, signature } = body;

        if (!documentId || !signature) {
            return NextResponse.json({ error: "Missing documentId or signature" }, { status: 400 });
        }

        const doc = await userCanAccessDocument(sessionUser, documentId);
        if (!doc) {
            return NextResponse.json({ error: "Document not found" }, { status: 404 });
        }

        const mustSign = await userMustSignDocument(sessionUser, documentId);
        const isPolicyDoc = doc.type === "POLICY" || doc.type === "LEGAL";

        if (mustSign || isPolicyDoc) {
            const hasRead = await userHasReadDocument(sessionUser.id, documentId);
            if (!hasRead) {
                return NextResponse.json(
                    {
                        error: "Please read the entire document before signing",
                        code: "READ_REQUIRED",
                    },
                    { status: 403 }
                );
            }
        }

        const existing = await prisma.signature.findUnique({
            where: {
                userId_documentId: { userId: sessionUser.id, documentId },
            },
        });
        if (existing) {
            return NextResponse.json({ error: "Already signed" }, { status: 409 });
        }

        const newSignature = await prisma.signature.create({
            data: {
                userId: sessionUser.id,
                email: sessionUser.email,
                documentId,
                signature,
            },
        });

        await prisma.requiredSigner.updateMany({
            where: {
                documentId,
                OR: [
                    { userId: sessionUser.id },
                    ...(sessionUser.email ? [{ email: sessionUser.email }] : []),
                ],
            },
            data: { signedAt: new Date() },
        });

        const updated = await prisma.document.findUnique({
            where: { id: documentId },
            include: { requiredSigners: true },
        });

        if (updated) {
            const unsignedCount = updated.requiredSigners.filter((s) => !s.signedAt).length;
            await prisma.document.update({
                where: { id: documentId },
                data: { status: unsignedCount === 0 ? "COMPLETED" : "PARTIALLY_SIGNED" },
            });
        }

        return NextResponse.json(newSignature);
    } catch (error) {
        console.error("Signature Error:", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}
