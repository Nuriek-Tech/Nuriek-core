import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ROLES, REPORT_ROLES } from "@/lib/constants";
import { canApproveLeaveRequest } from "@/lib/leave-approval";
import { requireSession, isNextResponse } from "@/lib/rbac";

export async function GET(req: Request) {
    const session = await requireSession();
    if (isNextResponse(session)) return session;

    if (!REPORT_ROLES.includes(session.role)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const userId = searchParams.get("userId");
    const type = searchParams.get("type");
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    try {
        const where: {
            status?: string;
            userId?: string;
            type?: string;
            startDate?: { gte?: Date; lte?: Date };
        } = {};

        if (status) where.status = status;
        if (userId) where.userId = userId;
        if (type) where.type = type;
        if (from) where.startDate = { ...where.startDate, gte: new Date(from) };
        if (to) {
            const end = new Date(to);
            end.setHours(23, 59, 59, 999);
            where.startDate = { ...where.startDate, lte: end };
        }

        const leaves = await prisma.leave.findMany({
            where: { ...where, ...(session.role === ROLES.MANAGER ? { user: { reportsToId: session.id } } : {}) },
            include: {
                user: {
                    select: {
                        name: true,
                        email: true,
                        role: true,
                        reportsToId: true,
                        profile: { select: { department: true } },
                    },
                },
            },
            orderBy: {
                startDate: "desc",
            },
        });

        return NextResponse.json(leaves.map(leave => ({
            ...leave,
            canApprove: leave.status === "PENDING" && canApproveLeaveRequest(session.role, leave.user.role, session.id, leave.user.reportsToId),
        })));
    } catch (error) {
        console.error("Leaves Report API Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
