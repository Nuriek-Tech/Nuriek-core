import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ROLES } from "@/lib/constants";

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> } // In Next.js App Router, params in route handlers should be awaited
) {
    try {
        const session = await getServerSession(authOptions);
        const userRole = (session?.user as any)?.role;
        
        // Only FOUNDER and HR_ADMIN can delete users
        if (userRole !== ROLES.FOUNDER && userRole !== ROLES.HR_ADMIN) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const { id } = await params;

        if (!id) {
            return new NextResponse("User ID is required", { status: 400 });
        }

        // Prevent self-deletion
        if ((session?.user as any)?.id === id) {
            return new NextResponse("Cannot delete your own account", { status: 400 });
        }

        // Let Prisma handle the cascading deletes (Profile, Attendance, Leaves, Timesheets)
        await prisma.user.delete({
            where: { id },
        });

        return NextResponse.json({ success: true, message: "User deleted successfully" });
    } catch (error) {
        console.error("Failed to delete user:", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
