import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ROLES } from "@/lib/constants";

export async function GET() {
    const session = await getServerSession(authOptions);

    if (!session) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    try {
        const users = await prisma.user.findMany({
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                profile: {
                    select: {
                        position: true,
                        department: true,
                    }
                }
            },
            orderBy: {
                name: 'asc'
            }
        });

        return NextResponse.json(users);
    } catch (error) {
        console.error("Error fetching users:", error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}

export async function DELETE(req: Request) {
    const session = await getServerSession(authOptions);
    const currentUserRole = (session?.user as any)?.role;

    // Strict Authorization: Only FOUNDER and HR_ADMIN can delete
    if (![ROLES.FOUNDER, ROLES.HR_ADMIN].includes(currentUserRole)) {
        return new NextResponse("Unauthorized", { status: 403 });
    }

    try {
        const body = await req.json();
        const { userId } = body;

        if (!userId) {
            return new NextResponse("User ID required", { status: 400 });
        }

        // Prevent self-deletion
        const currentUserEmail = session?.user?.email;
        const userToDelete = await prisma.user.findUnique({ where: { id: userId } });

        if (userToDelete?.email === currentUserEmail) {
            return new NextResponse("Cannot delete yourself", { status: 400 });
        }

        // Prevent deleting other Admins by HR_ADMIN (optional logic, but good practice)
        if (currentUserRole === ROLES.HR_ADMIN && [ROLES.FOUNDER, ROLES.HR_ADMIN].includes(userToDelete?.role as any)) {
            return new NextResponse("HR Admins cannot delete other Admins", { status: 403 });
        }

        await prisma.user.delete({
            where: { id: userId }
        });

        return NextResponse.json({ message: "User deleted successfully" });
    } catch (error) {
        console.error("Delete User Error:", error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}
