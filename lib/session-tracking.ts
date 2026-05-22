import { prisma } from "@/lib/prisma";
import { SESSION_INACTIVITY_MS } from "@/lib/constants";

export { SESSION_INACTIVITY_MS };

export type SessionEndReason = "logout" | "inactivity" | "new_login";

export function formatSessionDurationMs(ms: number): string {
    if (ms < 0) return "—";
    const totalMinutes = Math.floor(ms / 60_000);
    if (totalMinutes < 1) return "< 1 min";
    if (totalMinutes < 60) return `${totalMinutes} min`;
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

export function sessionDurationMs(session: {
    loginAt: Date;
    logoutAt: Date | null;
    lastActivityAt: Date;
}): number {
    const end = session.logoutAt ?? session.lastActivityAt;
    return Math.max(0, end.getTime() - session.loginAt.getTime());
}

export async function startLoginSession(userId: string) {
    const now = new Date();
    await prisma.loginSession.updateMany({
        where: { userId, logoutAt: null },
        data: { logoutAt: now, endReason: "new_login" },
    });
    return prisma.loginSession.create({
        data: {
            userId,
            loginAt: now,
            lastActivityAt: now,
        },
    });
}

export async function touchLoginSession(userId: string): Promise<void> {
    const now = new Date();
    const active = await prisma.loginSession.findFirst({
        where: { userId, logoutAt: null },
        orderBy: { loginAt: "desc" },
    });
    if (!active) return;
    await prisma.loginSession.update({
        where: { id: active.id },
        data: { lastActivityAt: now },
    });
}

export async function endActiveLoginSession(
    userId: string,
    reason: SessionEndReason
): Promise<void> {
    const now = new Date();
    await prisma.loginSession.updateMany({
        where: { userId, logoutAt: null },
        data: { logoutAt: now, endReason: reason },
    });
}

export async function endLoginSessionById(
    sessionId: string,
    reason: SessionEndReason
): Promise<void> {
    const now = new Date();
    await prisma.loginSession.updateMany({
        where: { id: sessionId, logoutAt: null },
        data: { logoutAt: now, endReason: reason },
    });
}
