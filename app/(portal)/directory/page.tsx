import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ROLES, filterDirectoryEmployees } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import DirectoryClient from "./DirectoryClient";

export default async function DirectoryPage() {
    const session = await getServerSession(authOptions);
    const viewerRole = session?.user?.role;
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
        reportsTo: e.reportsTo
            ? { id: e.reportsTo.id, name: e.reportsTo.name, email: e.reportsTo.email }
            : null,
        profile: e.profile
            ? {
                  position: e.profile.position,
                  department: e.profile.department,
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
