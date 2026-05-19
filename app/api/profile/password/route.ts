import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validatePasswordStrength } from "@/lib/password";
import { logAudit } from "@/lib/audit";

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { currentPassword, newPassword } = await req.json();

        if (!newPassword) {
            return NextResponse.json({ error: "New password is required" }, { status: 400 });
        }

        const strengthError = validatePasswordStrength(newPassword);
        if (strengthError) {
            return NextResponse.json({ error: strengthError }, { status: 400 });
        }

        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
        });

        if (!user || !user.password) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        if (!user.mustChangePassword) {
            if (!currentPassword) {
                return NextResponse.json(
                    { error: "Current password is required" },
                    { status: 400 }
                );
            }
            const matches = await bcrypt.compare(currentPassword, user.password);
            if (!matches) {
                return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
            }
        }

        const hashed = await bcrypt.hash(newPassword, 12);
        await prisma.user.update({
            where: { id: user.id },
            data: {
                password: hashed,
                mustChangePassword: false,
            },
        });

        await logAudit({
            actorId: user.id,
            actorEmail: user.email,
            action: "PASSWORD_CHANGE",
            entity: "User",
            entityId: user.id,
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Password change error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
