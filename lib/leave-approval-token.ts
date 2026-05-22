import crypto from "crypto";
import { prisma } from "@/lib/prisma";

export const LEAVE_APPROVAL_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

export type LeaveTokenAction = "APPROVE" | "REJECT";

export function hashLeaveApprovalToken(rawToken: string): string {
    return crypto.createHash("sha256").update(rawToken).digest("hex");
}

export function generateLeaveApprovalToken(): string {
    return crypto.randomBytes(24).toString("base64url");
}

export async function createLeaveApprovalTokens(leaveId: string): Promise<{
    approveToken: string;
    rejectToken: string;
}> {
    const approveToken = generateLeaveApprovalToken();
    const rejectToken = generateLeaveApprovalToken();
    const expiresAt = new Date(Date.now() + LEAVE_APPROVAL_EXPIRY_MS);

    await prisma.$transaction([
        prisma.leaveApprovalToken.deleteMany({ where: { leaveId } }),
        prisma.leaveApprovalToken.create({
            data: {
                leaveId,
                tokenHash: hashLeaveApprovalToken(approveToken),
                action: "APPROVE",
                expiresAt,
            },
        }),
        prisma.leaveApprovalToken.create({
            data: {
                leaveId,
                tokenHash: hashLeaveApprovalToken(rejectToken),
                action: "REJECT",
                expiresAt,
            },
        }),
    ]);

    return { approveToken, rejectToken };
}

export async function findLeaveApprovalToken(rawToken: string) {
    const tokenHash = hashLeaveApprovalToken(rawToken);
    return prisma.leaveApprovalToken.findUnique({
        where: { tokenHash },
        include: {
            leave: {
                include: {
                    user: { select: { id: true, name: true, email: true, role: true } },
                },
            },
        },
    });
}

export async function invalidateLeaveApprovalTokens(leaveId: string) {
    await prisma.leaveApprovalToken.deleteMany({ where: { leaveId } });
}
