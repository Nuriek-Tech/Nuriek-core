import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ROLES, ADMIN_ROLES } from "@/lib/constants";
import { sendOnboardingEmail } from "@/lib/mail";
import { requireRoles, isNextResponse } from "@/lib/rbac";
import { generateTemporaryPassword } from "@/lib/password";
import { isNuriekWorkEmail, normalizeWorkEmail, WORK_EMAIL_ERROR } from "@/lib/email-policy";
import { DEFAULT_INTERN_ONBOARDING_CHECKLIST } from "@/lib/nuriek-psychology";
import { REPORTING_MANAGER_ROLES } from "@/lib/reporting-manager";
import bcrypt from "bcryptjs";
import type { UserRole } from "@prisma/client";

export async function POST(req: Request) {
    const current = await requireRoles(ADMIN_ROLES);
    if (isNextResponse(current)) return current;

    try {
        const body = await req.json();
        const { name, email, role, department, position, reportsToId, joinDate } = body;

        if (
            current.role === ROLES.HR_ADMIN &&
            (role === ROLES.FOUNDER || role === ROLES.HR_ADMIN)
        ) {
            return NextResponse.json(
                { error: "HR Admins cannot create other Admin roles." },
                { status: 403 }
            );
        }

        if (typeof name !== "string" || !name.trim() || !email || !role || typeof position !== "string" || !position.trim() || typeof department !== "string" || !department.trim()) {
            return new NextResponse("Missing required fields", { status: 400 });
        }
        const allowedRoles = [ROLES.EMPLOYEE, ROLES.INTERN, ROLES.CONTRACTOR, ROLES.TEAM_LEAD, ROLES.MANAGER, ROLES.HR_ADMIN, ROLES.FOUNDER];
        if (!allowedRoles.includes(role)) return NextResponse.json({ error: "Invalid role" }, { status: 400 });
        const parsedJoinDate = typeof joinDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(joinDate) ? new Date(`${joinDate}T12:00:00+05:30`) : null;
        if (!parsedJoinDate || Number.isNaN(parsedJoinDate.getTime()) || parsedJoinDate.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }) !== joinDate) return NextResponse.json({ error: "Valid joining date is required" }, { status: 400 });

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
                name: name.trim(),
                email: normalizedEmail,
                role: role as UserRole,
                reportsToId: managerId,
                onboardingStatus: "IN_PROGRESS",
                mustChangePassword: true,
                password: hashedPassword,
                profile: {
                    create: {
                        department: department.trim(),
                        position: position.trim(),
                        joinDate: parsedJoinDate,
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

        await prisma.auditLog.create({ data: {
            actorId: current.id, actorEmail: current.email, action: "USER_ONBOARD", entity: "User", entityId: result.id,
            metadata: JSON.stringify({ email: normalizedEmail, role, joinDate: parsedJoinDate.toISOString() }),
        } });

        let emailSent = false;
        try {
            const emailResult = await sendOnboardingEmail({ name: name.trim(), email: normalizedEmail, temporaryPassword });
            emailSent = emailResult.success;
        } catch (error) {
            console.error("Onboarding email error:", error);
        }
        if (emailSent) await prisma.auditLog.create({ data: {
            actorId: current.id, actorEmail: current.email, action: "ONBOARDING_EMAIL_SENT", entity: "User", entityId: result.id,
        } });

        return NextResponse.json({
            message: "Employee onboarded successfully",
            user: { id: result.id, name: result.name, email: result.email },
            emailSent,
        });
    } catch (error) {
        console.error("Onboarding error:", error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}
