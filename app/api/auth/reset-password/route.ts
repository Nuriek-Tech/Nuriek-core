import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { validatePasswordStrength } from "@/lib/password";
import {
    consumePasswordResetToken,
    findValidResetToken,
} from "@/lib/password-reset";
import { checkRateLimit } from "@/lib/rate-limit";
import { logAudit } from "@/lib/audit";

export async function POST(req: Request) {
    try {
        const { token, password } = await req.json();

        if (!token || typeof token !== "string") {
            return NextResponse.json({ error: "Invalid or expired reset link." }, { status: 400 });
        }

        const limit = checkRateLimit(`reset-password:token:${token.slice(0, 16)}`);
        if (!limit.allowed) {
            return NextResponse.json(
                { error: "Too many attempts. Please request a new reset link." },
                { status: 429 }
            );
        }

        if (!password || typeof password !== "string") {
            return NextResponse.json({ error: "New password is required." }, { status: 400 });
        }

        const strengthError = validatePasswordStrength(password);
        if (strengthError) {
            return NextResponse.json({ error: strengthError }, { status: 400 });
        }

        const record = await findValidResetToken(token);
        if (!record?.user) {
            return NextResponse.json({ error: "Invalid or expired reset link." }, { status: 400 });
        }

        const hashed = await bcrypt.hash(password, 12);

        await prisma.user.update({
            where: { id: record.user.id },
            data: {
                password: hashed,
                mustChangePassword: false,
            },
        });

        await consumePasswordResetToken(record.user.id);

        await logAudit({
            actorId: record.user.id,
            actorEmail: record.user.email,
            action: "PASSWORD_RESET_COMPLETE",
            entity: "User",
            entityId: record.user.id,
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[reset-password]", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
