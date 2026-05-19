import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, requireRoles, isNextResponse } from "@/lib/rbac";
import { ADMIN_ROLES } from "@/lib/constants";
import { hasAnyRole } from "@/lib/roles";
import { sendSignatureRequestEmail } from "@/lib/mail";
import { logAudit } from "@/lib/audit";
type SignerInput = {
    email: string;
    userId?: string | null;
    role?: string;
};

export async function GET(req: Request) {
    const user = await requireSession();
    if (isNextResponse(user)) return user;

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");
    const flowsOnly = searchParams.get("flows") === "admin";
    const employeeOnly = searchParams.get("employee") === "1";
    const forUserId = searchParams.get("userId");
    const isAdmin = hasAnyRole(user.role, ADMIN_ROLES);

    try {
        const visibilityFilter =
            flowsOnly && isAdmin
                ? { requiredSigners: { some: {} } }
                : employeeOnly
                  ? {
                        targetUserId:
                            isAdmin && forUserId ? forUserId : user.id,
                    }
                  : isAdmin && !flowsOnly
                    ? {}
                    : {
                          OR: [
                              {
                                  AND: [
                                      { targetUserId: null },
                                      {
                                          OR: [
                                              { allowedRoles: "ALL" },
                                              { allowedRoles: { contains: user.role } },
                                              {
                                                  requiredSigners: {
                                                      some: {
                                                          OR: [
                                                              { userId: user.id },
                                                              { email: user.email || "" },
                                                          ],
                                                      },
                                                  },
                                              },
                                          ],
                                      },
                                  ],
                              },
                              { targetUserId: user.id },
                          ],
                      };

        const documents = await prisma.document.findMany({
            where: {
                AND: [
                    { type: { not: "DRIVE" } },
                    type ? { type } : {},
                    visibilityFilter,
                ],
            },
            include: {
                targetUser: { select: { id: true, name: true, email: true } },
                signatures: {
                    where: {
                        OR: [
                            { userId: user.id },
                            { email: user.email || "" },
                        ],
                    },
                },
                requiredSigners: true,
            },
            orderBy: { createdAt: "desc" },
        });

        const docIds = documents.map((d) => d.id);
        const readRows =
            docIds.length > 0
                ? await prisma.documentRead.findMany({
                      where: { userId: user.id, documentId: { in: docIds } },
                      select: { documentId: true, completedAt: true },
                  })
                : [];
        const readByDoc = new Map(readRows.map((r) => [r.documentId, r.completedAt]));

        const docsWithStatus = documents.map((doc) => ({
            ...doc,
            isSigned: doc.signatures.length > 0,
            hasRead: readByDoc.has(doc.id),
            readCompletedAt: readByDoc.get(doc.id) ?? null,
            signedCount: doc.requiredSigners.filter((s) => s.signedAt).length,
            totalSigners: doc.requiredSigners.length,
            isRequiredSigner: doc.requiredSigners.some(
                (s) => s.userId === user.id || s.email === user.email
            ),
        }));

        return NextResponse.json(docsWithStatus);
    } catch (error: unknown) {
        console.error("Documents Fetch Error:", error);
        const message = error instanceof Error ? error.message : String(error);
        return NextResponse.json(
            { error: "Internal Server Error", details: message },
            { status: 500 }
        );
    }
}

export async function POST(req: Request) {
    const user = await requireRoles(ADMIN_ROLES);
    if (isNextResponse(user)) return user;

    try {
        const body = await req.json();
        const { signers, ...docData } = body;
        const signerList = (signers ?? []) as SignerInput[];

        const document = await prisma.document.create({
            data: {
                title: docData.title,
                description: docData.description,
                url: docData.url,
                type: docData.type || "LEGAL",
                allowedRoles: body.allowedRoles || "ALL",
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
            metadata: { title: document.title, signers: signerList.length, flow: "signature_request" },
        });

        const emailResults = await Promise.all(
            signerList.map(async (s) => {
                const result = await sendSignatureRequestEmail({
                    to: s.email,
                    documentTitle: document.title,
                    description: document.description,
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
        console.error("Doc Error:", error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}
