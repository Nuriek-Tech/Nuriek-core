import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: Request) {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type"); // POLICY, LEGAL, DRIVE

    try {
        const userRole = (session.user as any).role;
        const currentUserId = (session.user as any).id;

        const documents = await (prisma as any).document.findMany({
            where: {
                AND: [
                    type ? { type } : {},
                    {
                        OR: [
                            { allowedRoles: "ALL" },
                            { allowedRoles: { contains: userRole } },
                            { requiredSigners: { some: { OR: [{ userId: currentUserId }, { email: session.user?.email || "" }] } } }
                        ]
                    }
                ]
            },
            include: {
                signatures: {
                    where: {
                        OR: [
                            { userId: currentUserId },
                            { email: session.user?.email || "" }
                        ]
                    }
                },
                requiredSigners: true
            },
            orderBy: { createdAt: 'desc' },
        });

        // Map to include isSigned boolean and progress
        const docsWithStatus = documents.map((doc: any) => ({
            ...doc,
            isSigned: doc.signatures.length > 0,
            signedCount: doc.requiredSigners.filter((s: any) => s.signedAt).length,
            totalSigners: doc.requiredSigners.length
        }));

        return NextResponse.json(docsWithStatus);
    } catch (error: any) {
        console.error("Documents Fetch Error:", error);
        return NextResponse.json({
            error: "Internal Server Error",
            details: error?.message || String(error)
        }, { status: 500 });
    }
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !["FOUNDER", "HR_ADMIN"].includes((session.user as any).role)) {
        return new NextResponse("Unauthorized", { status: 403 });
    }

    try {
        const body = await req.json();
        const { signers, ...docData } = body;

        const document = await (prisma as any).document.create({
            data: {
                ...docData,
                allowedRoles: body.allowedRoles || "ALL",
                requiredSigners: {
                    create: signers.map((s: any, idx: number) => ({
                        email: s.email,
                        userId: s.userId || null,
                        role: s.role || "SIGNER",
                        order: idx
                    }))
                }
            },
            include: { requiredSigners: true }
        });

        return NextResponse.json(document);
    } catch (error) {
        console.error("Doc Error:", error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}
