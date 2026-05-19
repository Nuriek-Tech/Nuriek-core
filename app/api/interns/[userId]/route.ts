import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, isNextResponse } from "@/lib/rbac";
import { ROLES, isSuperAdminRole } from "@/lib/constants";
import { hasHrPermission } from "@/lib/hr-permissions";
import { hasAnyRole, normalizeRole } from "@/lib/roles";
import { daysInSystem, formatTenure, resolveInternStartDate } from "@/lib/intern-tenure";

const INTERN_MANAGER_ROLES = [
    ROLES.HR_ADMIN,
    ROLES.FOUNDER,
    ROLES.MANAGER,
    ROLES.TEAM_LEAD,
] as const;

function canManageInterns(role: string, hrPermissions?: string | null): boolean {
    const normalized = normalizeRole(role) ?? ROLES.EMPLOYEE;
    if (isSuperAdminRole(normalized)) return true;
    return hasHrPermission(normalized, hrPermissions, "interns");
}

export async function GET(
    _req: Request,
    { params }: { params: Promise<{ userId: string }> }
) {
    const viewer = await requireSession();
    if (isNextResponse(viewer)) return viewer;

    const { userId } = await params;

    const isSelf = viewer.id === userId;
    const isManager =
        hasAnyRole(viewer.role, INTERN_MANAGER_ROLES) ||
        canManageInterns(viewer.role, viewer.hrPermissions);

    if (!isSelf && !isManager) {
        return new NextResponse("Forbidden", { status: 403 });
    }

    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                name: true,
                email: true,
                personalEmail: true,
                role: true,
                onboardingStatus: true,
                createdAt: true,
                reportsTo: { select: { id: true, name: true, email: true, role: true } },
                profile: {
                    select: {
                        position: true,
                        department: true,
                        joinDate: true,
                        phoneNumber: true,
                        bio: true,
                        address: true,
                    },
                },
                internPerformance: true,
            },
        });

        if (!user) {
            return new NextResponse("Not found", { status: 404 });
        }

        const hasInternRecord =
            user.role === ROLES.INTERN || user.internPerformance != null;

        if (!hasInternRecord && !isManager) {
            return new NextResponse("Not found", { status: 404 });
        }

        if (!hasInternRecord && isManager && user.role !== ROLES.INTERN) {
            return new NextResponse("Not an intern profile", { status: 404 });
        }

        const startDate = resolveInternStartDate(
            user.profile?.joinDate,
            user.createdAt
        );
        const days = daysInSystem(startDate);
        const tenureLabel = formatTenure(days);

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const [attendanceCount, recentAttendance, offerLetters] = await Promise.all([
            prisma.attendance.count({
                where: { userId, checkIn: { gte: thirtyDaysAgo } },
            }),
            prisma.attendance.findMany({
                where: { userId },
                orderBy: { checkIn: "desc" },
                take: 8,
                select: { id: true, checkIn: true, checkOut: true, status: true },
            }),
            user.email
                ? prisma.offerLetter.findMany({
                      where: {
                          candidateEmail: {
                              equals: user.email,
                              mode: "insensitive",
                          },
                      },
                      orderBy: { createdAt: "desc" },
                      take: 10,
                      select: {
                          id: true,
                          refNumber: true,
                          status: true,
                          position: true,
                          department: true,
                          createdAt: true,
                          emailedAt: true,
                          signedAt: true,
                          token: true,
                      },
                  })
                : Promise.resolve([]),
        ]);

        let onboardingChecklist: { task: string; done: boolean }[] = [];
        if (user.internPerformance?.onboardingData) {
            try {
                onboardingChecklist = JSON.parse(user.internPerformance.onboardingData);
            } catch {
                onboardingChecklist = [];
            }
        }

        const convertedAt = user.internPerformance?.convertedAt ?? null;
        const isIntern = user.role === ROLES.INTERN;

        return NextResponse.json({
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                personalEmail: user.personalEmail,
                role: user.role,
                onboardingStatus: user.onboardingStatus,
                createdAt: user.createdAt.toISOString(),
                reportsTo: user.reportsTo
                    ? {
                          id: user.reportsTo.id,
                          name: user.reportsTo.name,
                          email: user.reportsTo.email,
                          role: user.reportsTo.role,
                      }
                    : null,
            },
            profile: user.profile
                ? {
                      ...user.profile,
                      joinDate: user.profile.joinDate.toISOString(),
                  }
                : null,
            performance: user.internPerformance
                ? {
                      learningProgress: user.internPerformance.learningProgress,
                      taskCompletion: user.internPerformance.taskCompletion,
                      score: user.internPerformance.score,
                      duration: user.internPerformance.duration,
                      conversionRisk: user.internPerformance.conversionRisk,
                      onboardingData: user.internPerformance.onboardingData,
                      convertedAt: convertedAt?.toISOString() ?? null,
                      conversionOfferLetterId:
                          user.internPerformance.conversionOfferLetterId,
                      updatedAt: user.internPerformance.updatedAt.toISOString(),
                  }
                : null,
            tenure: {
                startDate: startDate.toISOString(),
                daysInSystem: days,
                label: tenureLabel,
            },
            attendance: {
                last30DaysCount: attendanceCount,
                recent: recentAttendance.map((a) => ({
                    ...a,
                    checkIn: a.checkIn.toISOString(),
                    checkOut: a.checkOut?.toISOString() ?? null,
                })),
            },
            offerLetters: offerLetters.map((o) => ({
                ...o,
                createdAt: o.createdAt.toISOString(),
                emailedAt: o.emailedAt?.toISOString() ?? null,
                signedAt: o.signedAt?.toISOString() ?? null,
            })),
            onboardingChecklist,
            canConvert: isManager && isIntern && !convertedAt,
            canSendOffer: isManager && (!isIntern || !!convertedAt),
            isIntern,
        });
    } catch (error) {
        console.error("Intern profile fetch error:", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
