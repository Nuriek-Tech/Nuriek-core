import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRoles, requireSession, isNextResponse } from "@/lib/rbac";
import { ADMIN_ROLES, ROLES } from "@/lib/constants";
import { logAudit } from "@/lib/audit";

export async function GET() {
    try {
        const session = await requireSession();
        if (isNextResponse(session)) return session;

        const user = await prisma.user.findUnique({
            where: { id: session.id },
            select: { id: true, name: true, email: true, role: true, profile: { select: { phoneNumber: true, position: true, department: true, joinDate: true, address: true, bio: true } } },
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
        const session = await requireSession();
        if (isNextResponse(session)) return session;

        const body = await req.json();

        if (body.userId && body.joinDate !== undefined) {
            const admin = await requireRoles(ADMIN_ROLES);
            if (isNextResponse(admin)) return admin;

            if (typeof body.userId !== "string" || typeof body.joinDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(body.joinDate)) {
                return NextResponse.json({ error: "Valid user and join date are required" }, { status: 400 });
            }
            const target = await prisma.user.findUnique({ where: { id: body.userId }, select: { role: true } });
            if (!target) return NextResponse.json({ error: "Employee not found" }, { status: 404 });
            if (admin.role === ROLES.HR_ADMIN && ADMIN_ROLES.includes(target.role as (typeof ADMIN_ROLES)[number])) {
                return NextResponse.json({ error: "Only Super Admin can edit administrator records" }, { status: 403 });
            }

            const joinDate = new Date(`${body.joinDate}T12:00:00.000Z`);
            if (Number.isNaN(joinDate.getTime()) || joinDate.toISOString().slice(0, 10) !== body.joinDate) {
                return NextResponse.json({ error: "Invalid join date" }, { status: 400 });
            }
            const updatedProfile = await prisma.profile.upsert({ where: { userId: body.userId }, update: { joinDate }, create: { userId: body.userId, joinDate } });
            await logAudit({ actorId: admin.id, actorEmail: admin.email, action: "USER_RECORD_UPDATE", entity: "User", entityId: body.userId, metadata: { fields: ["joinDate"] } });
            return NextResponse.json(updatedProfile);
        }

        const user = await prisma.user.findUnique({ where: { id: session.id }, select: { id: true } });
        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const { phoneNumber, bio, address } = body as {
            phoneNumber?: string;
            bio?: string;
            address?: string;
        };
        for (const [value, max] of [[phoneNumber, 40], [bio, 1000], [address, 500]] as const) {
            if (value !== undefined && (typeof value !== "string" || value.length > max)) {
                return NextResponse.json({ error: "Invalid profile field" }, { status: 400 });
            }
        }

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
