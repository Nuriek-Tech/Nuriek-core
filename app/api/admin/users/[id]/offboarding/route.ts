import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireHrPermission, isNextResponse } from "@/lib/rbac";
import { OFFBOARDING_TASKS } from "@/lib/offboarding";

async function authorize(id: string) {
    const actor = await requireHrPermission("directory");
    if (isNextResponse(actor)) return { error: actor };
    const employee = await prisma.user.findUnique({ where: { id }, select: { id: true, isActive: true } });
    if (!employee) return { error: NextResponse.json({ error: "Employee not found" }, { status: 404 }) };
    if (employee.isActive) return { error: NextResponse.json({ error: "Employee has not exited" }, { status: 400 }) };
    return { actor };
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const access = await authorize(id);
    if (access.error) return access.error;
    const logs = await prisma.auditLog.findMany({ where: { entity: "User", entityId: id, action: "OFFBOARDING_TASK_UPDATE" }, select: { metadata: true, createdAt: true, actorEmail: true }, orderBy: { createdAt: "asc" } });
    const tasks: Record<string, { done: boolean; at: string; by: string | null }> = {};
    for (const log of logs) {
        try {
            const data = JSON.parse(log.metadata || "{}");
            if (OFFBOARDING_TASKS.some(task => task.id === data.taskId)) tasks[data.taskId] = { done: data.done === true, at: log.createdAt.toISOString(), by: log.actorEmail };
        } catch { /* ignore malformed historical metadata */ }
    }
    return NextResponse.json({ tasks });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const access = await authorize(id);
    if (access.error) return access.error;
    const body = await req.json().catch(() => ({}));
    if (!OFFBOARDING_TASKS.some(task => task.id === body.taskId) || typeof body.done !== "boolean") return NextResponse.json({ error: "Invalid checklist item" }, { status: 400 });
    const entry = await prisma.auditLog.create({ data: { actorId: access.actor!.id, actorEmail: access.actor!.email, action: "OFFBOARDING_TASK_UPDATE", entity: "User", entityId: id, metadata: JSON.stringify({ taskId: body.taskId, done: body.done }) }, select: { createdAt: true } });
    return NextResponse.json({ done: body.done, at: entry.createdAt.toISOString(), by: access.actor!.email });
}
