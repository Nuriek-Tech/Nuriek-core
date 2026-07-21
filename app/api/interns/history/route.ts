import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ADMIN_ROLES } from "@/lib/constants";
import { requireRoles, isNextResponse } from "@/lib/rbac";

export async function GET() {
    const user = await requireRoles(ADMIN_ROLES);
    if (isNextResponse(user)) return user;

    try {
        const historyLogs = await prisma.auditLog.findMany({
            where: {
                action: "FINISH_LETTER_SENT",
                entity: "User"
            },
            select: {
                entityId: true,
                createdAt: true,
                actorEmail: true,
            },
            orderBy: {
                createdAt: "desc"
            }
        });

        // Group by entityId (userId) to get the latest finish letter sent for each intern
        const historyMap: Record<string, { sentAt: Date; sentBy: string | null }> = {};
        for (const log of historyLogs) {
            if (log.entityId && !historyMap[log.entityId]) {
                historyMap[log.entityId] = {
                    sentAt: log.createdAt,
                    sentBy: log.actorEmail,
                };
            }
        }

        return NextResponse.json(historyMap);
    } catch (error) {
        console.error("Error fetching finish letter history:", error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}
