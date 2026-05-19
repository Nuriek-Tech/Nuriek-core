import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRoles, isNextResponse } from "@/lib/rbac";
import { DIRECTORY_ROLES } from "@/lib/constants";
import { REPORTING_MANAGER_ROLES } from "@/lib/reporting-manager";
import { formatReportingManagerLabel } from "@/lib/reporting-manager";

export async function GET() {
    const user = await requireRoles(DIRECTORY_ROLES);
    if (isNextResponse(user)) return user;

    try {
        const managers = await prisma.user.findMany({
            where: { role: { in: REPORTING_MANAGER_ROLES } },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                profile: { select: { position: true } },
            },
            orderBy: { name: "asc" },
        });

        return NextResponse.json({
            managers: managers.map((m) => ({
                id: m.id,
                name: m.name,
                email: m.email,
                role: m.role,
                position: m.profile?.position ?? null,
                label: formatReportingManagerLabel(m),
            })),
        });
    } catch (error) {
        console.error("Managers list error:", error);
        return NextResponse.json({ error: "Failed to load managers" }, { status: 500 });
    }
}
