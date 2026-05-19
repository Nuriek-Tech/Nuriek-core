import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ROLES, ADMIN_ROLES } from "@/lib/constants";
import { sendOnboardingEmail } from "@/lib/mail";
import { requireRoles, isNextResponse } from "@/lib/rbac";
import { generateTemporaryPassword } from "@/lib/password";
import { isNuriekWorkEmail, normalizeWorkEmail, WORK_EMAIL_ERROR } from "@/lib/email-policy";
import { DEFAULT_INTERN_ONBOARDING_CHECKLIST } from "@/lib/nuriek-psychology";
import { REPORTING_MANAGER_ROLES } from "@/lib/reporting-manager";
import { logAudit } from "@/lib/audit";
import bcrypt from "bcryptjs";
import type { UserRole } from "@prisma/client";

export async function POST(req: Request) {
    const current = await requireRoles(ADMIN_ROLES);
    if (isNextResponse(current)) return current;

    try {
        const body = await req.json();
        const { name, email, role, department, position, reportsToId } = body;

        if (
            current.role === ROLES.HR_ADMIN &&
            (role === ROLES.FOUNDER || role === ROLES.HR_ADMIN)
        ) {
            return NextResponse.json(
                { error: "HR Admins cannot create other Admin roles." },
                { status: 403 }
            );
        }

        if (!name || !email || !role) {
            return new NextResponse("Missing required fields", { status: 400 });
        }

        const normalizedEmail = normalizeWorkEmail(email);
        if (!isNuriekWorkEmail(normalizedEmail)) {
            return NextResponse.json({ error: WORK_EMAIL_ERROR }, { status: 400 });
        }

        const existingUser = await prisma.user.findFirst({
            where: { email: normalizedEmail },
        });

        if (existingUser) {
            return new NextResponse("User with this email already exists", { status: 400 });
        }

        let managerId: string | null = null;
        if (reportsToId) {
            const manager = await prisma.user.findUnique({
                where: { id: String(reportsToId) },
                select: { id: true, role: true },
            });
            if (!manager) {
                return NextResponse.json({ error: "Reporting manager not found" }, { status: 404 });
            }
            if (!REPORTING_MANAGER_ROLES.includes(manager.role as (typeof REPORTING_MANAGER_ROLES)[number])) {
                return NextResponse.json(
                    { error: "Selected user cannot be a reporting manager" },
                    { status: 400 }
                );
            }
            managerId = manager.id;
        }

        const temporaryPassword = generateTemporaryPassword();
        const hashedPassword = await bcrypt.hash(temporaryPassword, 12);

        const result = await prisma.user.create({
            data: {
                name,
                email: normalizedEmail,
                role: role as UserRole,
                reportsToId: managerId,
                onboardingStatus: "IN_PROGRESS",
                mustChangePassword: true,
                password: hashedPassword,
                profile: {
                    create: {
                        department,
                        position,
                        joinDate: new Date(),
                    },
                },
                ...(role === ROLES.INTERN
                    ? {
                          internPerformance: {
                              create: {
                                  onboardingData: JSON.stringify(
                                      DEFAULT_INTERN_ONBOARDING_CHECKLIST
                                  ),
                                  duration: "Month 1",
                              },
                          },
                      }
                    : {}),
            },
        });

        await sendOnboardingEmail({
            name,
            email: normalizedEmail,
            temporaryPassword,
        });

        await logAudit({
            actorId: current.id,
            actorEmail: current.email,
            action: "USER_ONBOARD",
            entity: "User",
            entityId: result.id,
            metadata: { email: normalizedEmail, role },
        });

        return NextResponse.json({
            message: "Employee onboarded successfully",
            user: { id: result.id, name: result.name, email: result.email },
        });
    } catch (error) {
        console.error("Onboarding error:", error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}
