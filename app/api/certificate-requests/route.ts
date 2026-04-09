import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const ADMIN_ROLES = ["FOUNDER", "HR_ADMIN"];

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user) return new NextResponse("Unauthorized", { status: 401 });

    const userId = (session.user as any).id;
    const userRole = (session.user as any).role;
    const isAdmin = ADMIN_ROLES.includes(userRole);

    try {
        const requests = await (prisma as any).certificateRequest.findMany({
            where: isAdmin ? {} : { userId },
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
    const session = await getServerSession(authOptions);
    if (!session?.user) return new NextResponse("Unauthorized", { status: 401 });

    const userId = (session.user as any).id;

    try {
        const body = await req.json();
        const { type, purpose } = body;

        if (!type || !["EXPERIENCE", "BONAFIDE"].includes(type)) {
            return new NextResponse("Invalid certificate type", { status: 400 });
        }

        // Check for existing pending request of the same type
        const existing = await (prisma as any).certificateRequest.findFirst({
            where: { userId, type, status: "PENDING" }
        });

        if (existing) {
            return new NextResponse("You already have a pending request for this certificate type.", { status: 409 });
        }

        const request = await (prisma as any).certificateRequest.create({
            data: {
                userId,
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
