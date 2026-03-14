import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    try {
        const body = await req.json();
        const { documentId, signature } = body;

        const user = await prisma.user.findUnique({
            where: { email: session.user.email }
        });

        if (!user) return new NextResponse("User not found", { status: 404 });

        const newSignature = await prisma.signature.create({
            data: {
                userId: user.id,
                email: user.email,
                documentId,
                signature
            }
        });

        // Mark the dynamic signer as signed
        await (prisma as any).requiredSigner.updateMany({
            where: {
                documentId,
                OR: [
                    { userId: user.id },
                    { email: user.email }
                ]
            },
            data: { signedAt: new Date() }
        });

        // Check overall document completion
        const doc = await prisma.document.findUnique({
            where: { id: documentId },
            include: { requiredSigners: true }
        });

        if (doc) {
            const unsignedCount = doc.requiredSigners.filter((s: any) => !s.signedAt).length;

            if (unsignedCount === 0) {
                await prisma.document.update({
                    where: { id: documentId },
                    data: { status: "COMPLETED" }
                });
            } else {
                await prisma.document.update({
                    where: { id: documentId },
                    data: { status: "PARTIALLY_SIGNED" }
                });
            }
        }

        return NextResponse.json(newSignature);
    } catch (error) {
        console.error("Signature Error:", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
