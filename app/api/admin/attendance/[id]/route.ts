import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRoles, isNextResponse } from "@/lib/rbac";
import { ADMIN_ROLES } from "@/lib/constants";
import { logAudit } from "@/lib/audit";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const actor = await requireRoles(ADMIN_ROLES);
    if (isNextResponse(actor)) return actor;
    const { id } = await params;
    const record = await prisma.attendance.findUnique({ where: { id } });
    if (!record) return NextResponse.json({ error: "Attendance record not found" }, { status: 404 });

    try {
        const body = await req.json() as Record<string, unknown>;
        if (typeof body.checkOut !== "string" || typeof body.reason !== "string" || !body.reason.trim() || body.reason.trim().length > 500) {
            return NextResponse.json({ error: "Check-out time and a reason are required" }, { status: 400 });
        }
        const checkOut = new Date(body.checkOut);
        if (Number.isNaN(checkOut.getTime()) || checkOut < record.checkIn || checkOut > new Date() || checkOut.getTime() - record.checkIn.getTime() > 24 * 60 * 60 * 1000) {
            return NextResponse.json({ error: "Check-out must be after check-in, within 24 hours, and not in the future" }, { status: 400 });
        }
        if (record.breakStart && checkOut < record.breakStart) {
            return NextResponse.json({ error: "Check-out cannot be before the recorded break" }, { status: 400 });
        }
        if (record.breakEnd && checkOut < record.breakEnd) {
            return NextResponse.json({ error: "Check-out cannot be before the break ended" }, { status: 400 });
        }
        const nextSession = await prisma.attendance.findFirst({ where: { userId: record.userId, id: { not: id }, checkIn: { gt: record.checkIn, lt: checkOut } }, select: { id: true } });
        if (nextSession) return NextResponse.json({ error: "Check-out overlaps another attendance session" }, { status: 409 });
        const updated = await prisma.attendance.update({
            where: { id },
            data: {
                checkOut,
                ...(record.breakStart && !record.breakEnd ? { breakEnd: checkOut } : {}),
                note: body.reason.trim(),
            },
        });
        await logAudit({ actorId: actor.id, actorEmail: actor.email, action: "ATTENDANCE_CORRECT", entity: "Attendance", entityId: id, metadata: { previousCheckOut: record.checkOut?.toISOString() ?? null, checkOut: checkOut.toISOString(), reason: body.reason.trim() } });
        return NextResponse.json(updated);
    } catch (error) {
        console.error("Attendance correction failed:", error);
        return NextResponse.json({ error: "Could not update attendance" }, { status: 500 });
    }
}
