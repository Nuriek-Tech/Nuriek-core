import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isNuriekWorkEmail, normalizeWorkEmail } from "@/lib/email-policy";
import { checkRateLimit } from "@/lib/rate-limit";
import { createPasswordResetToken, PASSWORD_RESET_EXPIRY_MS } from "@/lib/password-reset";
import { sendPasswordResetEmail } from "@/lib/mail";
import { portalEmailUrl } from "@/lib/portal-url";
import { logAudit } from "@/lib/audit";

const GENERIC_SUCCESS =
    "If your work email is registered, you will receive a password reset link shortly.";

function clientIp(req: Request): string {
    const forwarded = req.headers.get("x-forwarded-for");
    if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
    return req.headers.get("x-real-ip") || "unknown";
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const email = normalizeWorkEmail(String(body.email ?? ""));

        const ip = clientIp(req);
        const ipLimit = checkRateLimit(`forgot-password:ip:${ip}`);
        if (!ipLimit.allowed) {
            return NextResponse.json({ message: GENERIC_SUCCESS });
        }

        if (!email || !isNuriekWorkEmail(email)) {
            return NextResponse.json({ message: GENERIC_SUCCESS });
        }

        const emailLimit = checkRateLimit(`forgot-password:email:${email}`);
        if (!emailLimit.allowed) {
            return NextResponse.json({ message: GENERIC_SUCCESS });
        }

        const user = await prisma.user.findUnique({
            where: { email },
            select: { id: true, email: true, name: true, password: true },
        });

        if (!user?.password || !user.email) {
            return NextResponse.json({ message: GENERIC_SUCCESS });
        }

        const rawToken = await createPasswordResetToken(user.id);
        const resetUrl = portalEmailUrl(
            `/login/reset-password?token=${encodeURIComponent(rawToken)}`
        );
        const expiresMinutes = Math.round(PASSWORD_RESET_EXPIRY_MS / 60000);

        const mailResult = await sendPasswordResetEmail({
            to: user.email,
            recipientName: user.name || "Team member",
            resetUrl,
            expiresMinutes,
        });

        if (mailResult.success) {
            await logAudit({
                actorId: user.id,
                actorEmail: user.email,
                action: "PASSWORD_RESET_REQUEST",
                entity: "User",
                entityId: user.id,
            });
        } else {
            console.error("[forgot-password] Email failed:", mailResult.message);
        }

        return NextResponse.json({ message: GENERIC_SUCCESS });
    } catch (error) {
        console.error("[forgot-password]", error);
        return NextResponse.json({ message: GENERIC_SUCCESS });
    }
}
