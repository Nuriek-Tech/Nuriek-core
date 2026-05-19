import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, isNextResponse } from "@/lib/rbac";
function canAccessDriveDoc(allowedRoles: string, userRole: string): boolean {
    if (allowedRoles === "ALL") return true;
    return allowedRoles.split(",").map((r) => r.trim()).includes(userRole);
}

export async function GET() {
    const user = await requireSession();
    if (isNextResponse(user)) return user;

    try {
        const documents = await prisma.document.findMany({
            where: { type: "DRIVE" },
            orderBy: { updatedAt: "desc" },
        });

        const visible = documents.filter((doc) =>
            canAccessDriveDoc(doc.allowedRoles, user.role)
        );

        return NextResponse.json(visible);
    } catch (error) {
        console.error("Drive list error:", error);
        return NextResponse.json({ error: "Failed to load drive files" }, { status: 500 });
    }
}
