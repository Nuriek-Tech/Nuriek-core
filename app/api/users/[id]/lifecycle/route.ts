import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRoles } from "@/lib/rbac";
import { ROLES } from "@/lib/constants";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const params = await context.params;
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isHrOrAdmin = [ROLES.FOUNDER, ROLES.HR_ADMIN, ROLES.MANAGER, ROLES.TEAM_LEAD].includes(session.user.role as any);
    const isSelf = session.user.id === params.id;

    if (!isHrOrAdmin && !isSelf) {
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
        let offerLetters: any[] = [];
        if (user?.email || user?.personalEmail) {
            const emails = [user.email, user.personalEmail].filter(Boolean) as string[];
            if (emails.length > 0) {
                offerLetters = await prisma.offerLetter.findMany({
                    where: {
                        candidateEmail: { in: emails }
                    },
                    orderBy: { createdAt: "asc" }
                });
            }
        }

        return NextResponse.json({ logs, offerLetters });
    } catch (e: any) {
        return NextResponse.json({ error: "Failed to fetch lifecycle" }, { status: 500 });
    }
}
