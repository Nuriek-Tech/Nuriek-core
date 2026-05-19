import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireRoles, isNextResponse } from "@/lib/rbac";
import { ADMIN_ROLES } from "@/lib/constants";

export async function GET() {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
            include: { profile: true },
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

/** Admin: update join date. Self: update phone, bio, address. */
export async function PATCH(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();

        if (body.userId && body.joinDate !== undefined) {
            const admin = await requireRoles(ADMIN_ROLES);
            if (isNextResponse(admin)) return admin;

            const updatedProfile = await prisma.profile.update({
                where: { userId: body.userId },
                data: {
                    joinDate: body.joinDate ? new Date(body.joinDate) : undefined,
                },
            });
            return NextResponse.json(updatedProfile);
        }

        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
        });
        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const { phoneNumber, bio, address } = body as {
            phoneNumber?: string;
            bio?: string;
            address?: string;
        };

        const profile = await prisma.profile.upsert({
            where: { userId: user.id },
            update: {
                ...(phoneNumber !== undefined && { phoneNumber }),
                ...(bio !== undefined && { bio }),
                ...(address !== undefined && { address }),
            },
            create: {
                userId: user.id,
                phoneNumber: phoneNumber ?? null,
                bio: bio ?? null,
                address: address ?? null,
            },
        });

        return NextResponse.json(profile);
    } catch (error) {
        console.error("Profile Update Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
