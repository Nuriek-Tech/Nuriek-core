import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ROLES } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import DirectoryClient from "./DirectoryClient";

export default async function DirectoryPage() {
    const session = await getServerSession(authOptions);
    const canOnboard =
        session?.user?.role === ROLES.FOUNDER || session?.user?.role === ROLES.HR_ADMIN;
    const isSuperAdmin = canOnboard;

    const employees = await prisma.user.findMany({
        include: {
            profile: true,
            reportsTo: { select: { id: true, name: true, email: true } },
        },
        orderBy: { name: "asc" },
    });

    const serialized = employees.map((e) => ({
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

    return (
        <DirectoryClient
            employees={serialized}
            canOnboard={canOnboard}
            isSuperAdmin={isSuperAdmin}
        />
    );
}
