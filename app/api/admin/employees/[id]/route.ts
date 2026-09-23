import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRoles, isNextResponse } from "@/lib/rbac";
import { ADMIN_ROLES, ROLES } from "@/lib/constants";
import { REPORTING_MANAGER_ROLES } from "@/lib/reporting-manager";
import { logAudit } from "@/lib/audit";

const MAX_LENGTH = { name: 120, position: 120, department: 120, phoneNumber: 40, address: 500 } as const;

function optionalText(value: unknown, limit: number): string | null | undefined {
    if (value === undefined) return undefined;
    if (typeof value !== "string") throw new Error("Invalid text field");
    const trimmed = value.trim();
    if (trimmed.length > limit) throw new Error(`Field must be ${limit} characters or fewer`);
    return trimmed || null;
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const actor = await requireRoles(ADMIN_ROLES);
    if (isNextResponse(actor)) return actor;

    const { id } = await params;
    const employee = await prisma.user.findUnique({
        where: { id },
        select: { id: true, role: true, reportsToId: true, profile: true },
    });
    if (!employee) return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    if (actor.role === ROLES.HR_ADMIN && ADMIN_ROLES.includes(employee.role as (typeof ADMIN_ROLES)[number])) {
        return NextResponse.json({ error: "Only Super Admin can edit administrator records" }, { status: 403 });
    }

    try {
        const body = await req.json() as Record<string, unknown>;
        const allowed = new Set(["name", "position", "department", "phoneNumber", "address", "joinDate", "reportsToId"]);
        if (!body || typeof body !== "object" || Array.isArray(body) || Object.keys(body).some((key) => !allowed.has(key))) {
            return NextResponse.json({ error: "Unsupported employee field" }, { status: 400 });
        }

        const name = optionalText(body.name, MAX_LENGTH.name);
        if (body.name !== undefined && !name) {
            return NextResponse.json({ error: "Employee name is required" }, { status: 400 });
        }
        const position = optionalText(body.position, MAX_LENGTH.position);
        const department = optionalText(body.department, MAX_LENGTH.department);
        const phoneNumber = optionalText(body.phoneNumber, MAX_LENGTH.phoneNumber);
        const address = optionalText(body.address, MAX_LENGTH.address);

        let joinDate: Date | undefined;
        if (body.joinDate !== undefined) {
            if (typeof body.joinDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(body.joinDate)) {
                return NextResponse.json({ error: "Join date must use YYYY-MM-DD" }, { status: 400 });
            }
            joinDate = new Date(`${body.joinDate}T12:00:00.000Z`);
            if (Number.isNaN(joinDate.getTime()) || joinDate.toISOString().slice(0, 10) !== body.joinDate) {
                return NextResponse.json({ error: "Invalid join date" }, { status: 400 });
            }
        }

        let reportsToId: string | null | undefined;
        if (body.reportsToId !== undefined) {
            if (body.reportsToId !== null && typeof body.reportsToId !== "string") {
                return NextResponse.json({ error: "Invalid reporting manager" }, { status: 400 });
            }
            reportsToId = body.reportsToId || null;
            if (reportsToId === id) return NextResponse.json({ error: "An employee cannot report to themselves" }, { status: 400 });
            if (reportsToId) {
                const manager = await prisma.user.findUnique({ where: { id: reportsToId }, select: { role: true, isActive: true, reportsToId: true } });
                if (!manager?.isActive || !REPORTING_MANAGER_ROLES.includes(manager.role as (typeof REPORTING_MANAGER_ROLES)[number])) {
                    return NextResponse.json({ error: "Select an active reporting manager" }, { status: 400 });
                }
                let ancestor = manager.reportsToId;
                const visited = new Set([reportsToId]);
                while (ancestor) {
                    if (ancestor === id || visited.has(ancestor)) {
                        return NextResponse.json({ error: "Reporting structure cannot contain a cycle" }, { status: 400 });
                    }
                    visited.add(ancestor);
                    const next = await prisma.user.findUnique({ where: { id: ancestor }, select: { reportsToId: true } });
                    ancestor = next?.reportsToId ?? null;
                }
            }
        }

        const updated = await prisma.$transaction(async (tx) => {
            await tx.user.update({ where: { id }, data: { ...(name !== undefined && { name }), ...(reportsToId !== undefined && { reportsToId }) } });
            return tx.profile.upsert({
                where: { userId: id },
                update: { ...(position !== undefined && { position }), ...(department !== undefined && { department }), ...(phoneNumber !== undefined && { phoneNumber }), ...(address !== undefined && { address }), ...(joinDate && { joinDate }) },
                create: { userId: id, position: position ?? null, department: department ?? null, phoneNumber: phoneNumber ?? null, address: address ?? null, ...(joinDate && { joinDate }) },
            });
        });

        await logAudit({ actorId: actor.id, actorEmail: actor.email, action: "USER_RECORD_UPDATE", entity: "User", entityId: id, metadata: { fields: Object.keys(body) } });
        return NextResponse.json({ success: true, profile: updated });
    } catch (error) {
        if (error instanceof Error && (error.message === "Invalid text field" || error.message.startsWith("Field must"))) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }
        console.error("Employee record update failed:", error);
        return NextResponse.json({ error: "Could not update employee record" }, { status: 500 });
    }
}
