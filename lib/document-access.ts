import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/lib/rbac";

export async function userCanAccessDocument(user: SessionUser, documentId: string) {
    const doc = await prisma.document.findFirst({
        where: {
            id: documentId,
            AND: [
                {
                    OR: [
                        { allowedRoles: "ALL" },
                        { allowedRoles: { contains: user.role } },
                        {
                            requiredSigners: {
                                some: {
                                    OR: [
                                        { userId: user.id },
                                        ...(user.email ? [{ email: user.email }] : []),
                                    ],
                                },
                            },
                        },
                    ],
                },
            ],
        },
    });
    return doc;
}

export async function userMustSignDocument(user: SessionUser, documentId: string) {
    const signer = await prisma.requiredSigner.findFirst({
        where: {
            documentId,
            OR: [
                { userId: user.id },
                ...(user.email ? [{ email: user.email }] : []),
            ],
        },
    });
    return Boolean(signer);
}

export async function userHasReadDocument(userId: string, documentId: string) {
    const read = await prisma.documentRead.findUnique({
        where: { userId_documentId: { userId, documentId } },
    });
    return Boolean(read);
}
