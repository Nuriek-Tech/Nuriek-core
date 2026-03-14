import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ROLES } from "@/lib/constants";

export async function GET() {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
            include: {
                profile: true,
            },
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        return NextResponse.json(user);
    } catch (error) {
        console.error("Profile API Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function PATCH(req: Request) {
    const session = await getServerSession(authOptions);
    const currentUserRole = (session?.user as any)?.role;

    // Only Admin/HR can edit other profiles
    if (![ROLES.FOUNDER, ROLES.HR_ADMIN].includes(currentUserRole)) {
        return new NextResponse("Unauthorized", { status: 403 });
    }

    try {
        const body = await req.json();
        const { userId, joinDate } = body;

        const updatedProfile = await prisma.profile.update({
            where: { userId },
            data: {
                joinDate: joinDate ? new Date(joinDate) : undefined
            }
        });

        return NextResponse.json(updatedProfile);
    } catch (error) {
        console.error("Profile Update Error:", error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}
