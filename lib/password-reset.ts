import crypto from "crypto";
import { prisma } from "@/lib/prisma";

export const PASSWORD_RESET_EXPIRY_MS = 60 * 60 * 1000; // 1 hour

export function hashResetToken(rawToken: string): string {
    return crypto.createHash("sha256").update(rawToken).digest("hex");
}

export function generateResetToken(): string {
    return crypto.randomBytes(32).toString("hex");
}

export async function createPasswordResetToken(userId: string): Promise<string> {
    const rawToken = generateResetToken();
    const tokenHash = hashResetToken(rawToken);
    const expiresAt = new Date(Date.now() + PASSWORD_RESET_EXPIRY_MS);

    await prisma.$transaction([
        prisma.passwordResetToken.deleteMany({ where: { userId } }),
        prisma.passwordResetToken.create({
            data: { userId, tokenHash, expiresAt },
        }),
    ]);

    return rawToken;
}

export async function findValidResetToken(rawToken: string) {
    const tokenHash = hashResetToken(rawToken);
    const record = await prisma.passwordResetToken.findUnique({
        where: { tokenHash },
        include: {
            user: {
                select: { id: true, email: true, name: true, password: true },
            },
        },
    });

    if (!record || record.expiresAt < new Date()) return null;
    if (!record.user?.password) return null;
    return record;
}

export async function consumePasswordResetToken(userId: string) {
    await prisma.passwordResetToken.deleteMany({ where: { userId } });
}
