import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, isNextResponse } from "@/lib/rbac";
import { ADMIN_ROLES } from "@/lib/constants";

export async function GET() {
    const user = await requireSession();
    if (isNextResponse(user)) return user;

    const isAdmin = ADMIN_ROLES.includes(user.role);

    try {
        const requests = await prisma.certificateRequest.findMany({
            where: isAdmin ? {} : { userId: user.id },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        role: true,
                        profile: {
                            select: { department: true, position: true, joinDate: true }
                        }
                    }
                }
            },
            orderBy: { requestedAt: "desc" }
        });

        return NextResponse.json(requests);
    } catch (error) {
        console.error("[GET /api/certificate-requests]", error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}

export async function POST(req: Request) {
    const user = await requireSession();
    if (isNextResponse(user)) return user;

    try {
        const body = await req.json();
        const { type, purpose } = body;

        if (!type || !["EXPERIENCE", "BONAFIDE"].includes(type)) {
            return new NextResponse("Invalid certificate type", { status: 400 });
        }

        const existing = await prisma.certificateRequest.findFirst({
            where: { userId: user.id, type, status: "PENDING" }
        });

        if (existing) {
            return new NextResponse("You already have a pending request for this certificate type.", { status: 409 });
        }

        const request = await prisma.certificateRequest.create({
            data: {
                userId: user.id,
                type,
                purpose: purpose || null,
                status: "PENDING"
            }
        });

        return NextResponse.json(request, { status: 201 });
    } catch (error) {
        console.error("[POST /api/certificate-requests]", error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}
