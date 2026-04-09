import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const ADMIN_ROLES = ["FOUNDER", "HR_ADMIN"];

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return new NextResponse("Unauthorized", { status: 401 });

    const userRole = (session.user as any).role;
    const approverName = (session?.user as any)?.name || "HR Admin";

    if (!ADMIN_ROLES.includes(userRole)) {
        return new NextResponse("Forbidden — Super Admin only", { status: 403 });
    }

    try {
        const body = await req.json();
        const { action, rejectionNote } = body; // action: "approve" | "reject"

        if (!["approve", "reject"].includes(action)) {
            return new NextResponse("Invalid action", { status: 400 });
        }

        const request = await (prisma as any).certificateRequest.findUnique({
            where: { id: params.id }
        });

        if (!request) return new NextResponse("Not Found", { status: 404 });
        if (request.status !== "PENDING") {
            return new NextResponse("Request is already processed", { status: 409 });
        }

        const updated = await (prisma as any).certificateRequest.update({
            where: { id: params.id },
            data: {
                status: action === "approve" ? "APPROVED" : "REJECTED",
                approvedBy: action === "approve" ? approverName : null,
                approvedAt: action === "approve" ? new Date() : null,
                rejectedAt: action === "reject" ? new Date() : null,
                rejectionNote: action === "reject" ? (rejectionNote || null) : null,
            },
            include: {
                user: { select: { name: true, email: true, role: true } }
            }
        });

        return NextResponse.json(updated);
    } catch (error) {
        console.error("[PATCH /api/certificate-requests/[id]]", error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}
