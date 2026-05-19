import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRoles, isNextResponse } from "@/lib/rbac";
import { ADMIN_ROLES } from "@/lib/constants";

export async function PATCH(req: Request, props: { params: Promise<{ id: string }> }) {
    const user = await requireRoles(ADMIN_ROLES);
    if (isNextResponse(user)) return user;

    const { id } = await props.params;
    const approverName = user.name || "HR Admin";

    try {
        const body = await req.json();
        const { action, rejectionNote } = body;

        if (!["approve", "reject"].includes(action)) {
            return new NextResponse("Invalid action", { status: 400 });
        }

        const request = await prisma.certificateRequest.findUnique({
            where: { id }
        });

        if (!request) return new NextResponse("Not Found", { status: 404 });
        if (request.status !== "PENDING") {
            return new NextResponse("Request is already processed", { status: 409 });
        }

        const updated = await prisma.certificateRequest.update({
            where: { id },
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
