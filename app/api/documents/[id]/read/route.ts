import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, isNextResponse } from "@/lib/rbac";
import { userCanAccessDocument } from "@/lib/document-access";

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

    const read = await prisma.documentRead.findUnique({
        where: { userId_documentId: { userId: sessionUser.id, documentId: id } },
    });

    return NextResponse.json({ hasRead: Boolean(read), completedAt: read?.completedAt ?? null });
}

export async function POST(
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

    const read = await prisma.documentRead.upsert({
        where: { userId_documentId: { userId: sessionUser.id, documentId: id } },
        create: { userId: sessionUser.id, documentId: id },
        update: { completedAt: new Date() },
    });

    return NextResponse.json({ hasRead: true, completedAt: read.completedAt });
}
