import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRoles, isNextResponse } from "@/lib/rbac";
import { ADMIN_ROLES } from "@/lib/constants";
import { formatSessionDurationMs, sessionDurationMs } from "@/lib/session-tracking";

export async function GET(req: Request) {
    const user = await requireRoles(ADMIN_ROLES);
    if (isNextResponse(user)) return user;

    try {
        const { searchParams } = new URL(req.url);
        const days = Math.min(90, Math.max(1, Number(searchParams.get("days") || 30)));
        const since = new Date();
        since.setDate(since.getDate() - days);

        const sessions = await prisma.loginSession.findMany({
            where: { loginAt: { gte: since } },
            include: {
                user: {
                    select: { id: true, name: true, email: true, role: true },
                },
            },
            orderBy: { loginAt: "desc" },
            take: 500,
        });

        const now = Date.now();
        const rows = sessions.map((s) => {
            const isActive = !s.logoutAt;
            const durationMs = isActive
                ? now - s.loginAt.getTime()
                : sessionDurationMs(s);
            return {
                id: s.id,
                userId: s.userId,
                user: s.user,
                loginAt: s.loginAt.toISOString(),
                lastActivityAt: s.lastActivityAt.toISOString(),
                logoutAt: s.logoutAt?.toISOString() ?? null,
                endReason: s.endReason,
                isActive,
                durationMs,
                durationLabel: formatSessionDurationMs(durationMs),
            };
        });

        return NextResponse.json({ sessions: rows });
    } catch (error) {
        console.error("[login-sessions]", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
