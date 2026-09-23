import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, isNextResponse } from "@/lib/rbac";
import { ROLES } from "@/lib/constants";

export async function GET(
    _req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const params = await context.params;
    const session = await requireSession();
    if (isNextResponse(session)) return session;
    const isAdmin = session.role === ROLES.FOUNDER || session.role === ROLES.HR_ADMIN;
    const isSelf = session.id === params.id;
    const directReport = !isAdmin && !isSelf && (session.role === ROLES.MANAGER || session.role === ROLES.TEAM_LEAD)
        ? await prisma.user.findFirst({ where: { id: params.id, reportsToId: session.id }, select: { id: true } })
        : null;

    if (!isAdmin && !isSelf && !directReport) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    try {
        const userId = params.id;
        const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, personalEmail: true } });

        const logs = await prisma.auditLog.findMany({
            where: {
                entityId: userId,
            },
            orderBy: {
                createdAt: "asc",
            },
        });

        // Also fetch any offer letters sent to them for earlier onboarding events
        let offerLetters: { id: string; createdAt: Date; emailedAt: Date | null; signedAt: Date | null; status: string }[] = [];
        if (user?.email || user?.personalEmail) {
            const emails = [user.email, user.personalEmail].filter(Boolean) as string[];
            if (emails.length > 0) {
                offerLetters = await prisma.offerLetter.findMany({
                    where: {
                        candidateEmail: { in: emails }
                    },
                    select: { id: true, createdAt: true, emailedAt: true, signedAt: true, status: true },
                    orderBy: { createdAt: "asc" }
                });
            }
        }

        return NextResponse.json({ logs, offerLetters });
    } catch {
        return NextResponse.json({ error: "Failed to fetch lifecycle" }, { status: 500 });
    }
}
