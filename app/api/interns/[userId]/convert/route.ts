import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireHrPermission, isNextResponse } from "@/lib/rbac";
import { ROLES } from "@/lib/constants";
import { logAudit } from "@/lib/audit";
import { offerLetterPrefillPath } from "@/lib/intern-conversion";
import { roleDefaultsForDepartment } from "@/lib/offer-role-catalog";

type ConvertBody = {
    position?: string;
    department?: string;
    employmentType?: string;
};

export async function POST(
    req: Request,
    { params }: { params: Promise<{ userId: string }> }
) {
    const actor = await requireHrPermission("interns");
    if (isNextResponse(actor)) return actor;

    const { userId } = await params;

    let body: ConvertBody = {};
    try {
        body = await req.json();
    } catch {
        body = {};
    }

    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { profile: true, internPerformance: true },
        });

        if (!user) {
            return new NextResponse("User not found", { status: 404 });
        }

        if (user.role !== ROLES.INTERN) {
            if (user.internPerformance?.convertedAt) {
                const path = offerLetterPrefillPath({
                    internUserId: user.id,
                    candidateName: user.name || "Candidate",
                    candidateEmail: user.email,
                    position: user.profile?.position,
                    department: user.profile?.department,
                    employmentType: body.employmentType || "Full-time",
                });
                return NextResponse.json({
                    success: true,
                    alreadyConverted: true,
                    convertedAt: user.internPerformance.convertedAt.toISOString(),
                    offerLetterPath: path,
                });
            }
            return new NextResponse("User is not an intern", { status: 400 });
        }

        const department =
            body.department?.trim() ||
            user.profile?.department ||
            "Engineering";
        const defaults = roleDefaultsForDepartment(department);
        const position =
            body.position?.trim() ||
            user.profile?.position ||
            defaults.position;
        const employmentType = body.employmentType?.trim() || "Full-time";
        const now = new Date();

        await prisma.$transaction([
            prisma.user.update({
                where: { id: userId },
                data: {
                    role: ROLES.EMPLOYEE,
                    onboardingStatus: "IN_PROGRESS",
                },
            }),
            prisma.profile.upsert({
                where: { userId },
                create: {
                    userId,
                    department,
                    position,
                    joinDate: user.profile?.joinDate ?? now,
                },
                update: { department, position },
            }),
            prisma.internPerformance.upsert({
                where: { userId },
                create: {
                    userId,
                    convertedAt: now,
                },
                update: {
                    convertedAt: now,
                },
            }),
        ]);

        await logAudit({
            actorId: actor.id,
            actorEmail: actor.email,
            action: "INTERN_CONVERT",
            entity: "User",
            entityId: userId,
            metadata: {
                name: user.name,
                email: user.email,
                position,
                department,
                employmentType,
            },
        });

        const offerLetterPath = offerLetterPrefillPath({
            internUserId: user.id,
            candidateName: user.name || "Candidate",
            candidateEmail: user.email,
            position,
            department,
            employmentType,
        });

        return NextResponse.json({
            success: true,
            convertedAt: now.toISOString(),
            offerLetterPath,
            user: {
                id: user.id,
                name: user.name,
                role: ROLES.EMPLOYEE,
                position,
                department,
            },
        });
    } catch (error) {
        console.error("Intern convert error:", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
