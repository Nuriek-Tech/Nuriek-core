import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/rbac";
import { ROLES, filterDirectoryEmployees } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import DirectoryClient from "./DirectoryClient";

export default async function DirectoryPage() {
    const session = await getSessionUser();
    if (!session) redirect("/login");
    const viewerRole = session.role;
    const canOnboard =
        viewerRole === ROLES.FOUNDER || viewerRole === ROLES.HR_ADMIN;
    const isSuperAdmin = viewerRole === ROLES.FOUNDER;

    const allUsers = await prisma.user.findMany({
        include: {
            profile: true,
            reportsTo: { select: { id: true, name: true, email: true } },
        },
        orderBy: { name: "asc" },
    });

    const serialized = allUsers.map((e) => ({
        id: e.id,
        name: e.name,
        email: e.email,
        role: e.role,
        isActive: e.isActive,
        onboardingStatus: e.onboardingStatus,
        createdAt: e.createdAt.toISOString(),
        updatedAt: e.updatedAt.toISOString(),
        reportsTo: e.reportsTo
            ? { id: e.reportsTo.id, name: e.reportsTo.name, email: e.reportsTo.email }
            : null,
        profile: e.profile
            ? {
                  position: e.profile.position,
                  department: e.profile.department,
                  joinDate: e.profile.joinDate.toISOString(),
              }
            : null,
    }));

    const employees = filterDirectoryEmployees(serialized, viewerRole);

    return (
        <DirectoryClient
            employees={employees}
            canOnboard={canOnboard}
            isSuperAdmin={isSuperAdmin}
        />
    );
}
