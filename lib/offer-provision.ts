import bcrypt from "bcryptjs";
import type { OfferLetter, User } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ROLES } from "@/lib/constants";
import { isNuriekWorkEmail, normalizeWorkEmail } from "@/lib/email-policy";
import { generateTemporaryPassword } from "@/lib/password";
import { resolveOfferEmploymentType, isInternEmploymentType } from "@/lib/offer-letter";
import { DEFAULT_INTERN_ONBOARDING_CHECKLIST } from "@/lib/nuriek-psychology";
import type { UserRole } from "@prisma/client";

export type ProvisionResult =
    | { ok: true; user: Pick<User, "id" | "email" | "name" | "role">; created: boolean }
    | { ok: false; reason: "no_work_email" | "already_linked" | "email_taken"; message: string };

/** Create or link a portal user when a candidate signs an offer (requires @nuriek.com on the offer). */
export async function provisionUserFromSignedOffer(
    offer: OfferLetter,
    signedName?: string | null
): Promise<ProvisionResult> {
    if (offer.provisionedUserId) {
        const existing = await prisma.user.findUnique({
            where: { id: offer.provisionedUserId },
            select: { id: true, email: true, name: true, role: true },
        });
        if (existing) {
            return { ok: true, user: existing, created: false };
        }
    }

    const rawEmail = offer.candidateEmail?.trim();
    if (!rawEmail || !isNuriekWorkEmail(rawEmail)) {
        return {
            ok: false,
            reason: "no_work_email",
            message:
                "Add a @nuriek.com work email on the offer (or send onboarding manually) to create the portal account.",
        };
    }

    const email = normalizeWorkEmail(rawEmail);
    const displayName = signedName?.trim() || offer.candidateName;
    const employmentType = resolveOfferEmploymentType(offer);
    const role: UserRole = isInternEmploymentType(employmentType) ? ROLES.INTERN : ROLES.EMPLOYEE;

    const existingByEmail = await prisma.user.findUnique({
        where: { email },
        select: { id: true, email: true, name: true, role: true },
    });

    if (existingByEmail) {
        await prisma.offerLetter.update({
            where: { id: offer.id },
            data: {
                provisionedUserId: existingByEmail.id,
                provisionedAt: new Date(),
            },
        });
        return { ok: true, user: existingByEmail, created: false };
    }

    const temporaryPassword = generateTemporaryPassword();
    const hashedPassword = await bcrypt.hash(temporaryPassword, 12);

    const user = await prisma.user.create({
        data: {
            name: displayName,
            email,
            role,
            onboardingStatus: "IN_PROGRESS",
            mustChangePassword: true,
            password: hashedPassword,
            profile: {
                create: {
                    department: offer.department || "General",
                    position: offer.position,
                    joinDate: new Date(),
                },
            },
            ...(role === ROLES.INTERN
                ? {
                      internPerformance: {
                          create: {
                              onboardingData: JSON.stringify(DEFAULT_INTERN_ONBOARDING_CHECKLIST),
                              duration: "Month 1",
                          },
                      },
                  }
                : {}),
        },
        select: { id: true, email: true, name: true, role: true },
    });

    await prisma.offerLetter.update({
        where: { id: offer.id },
        data: {
            provisionedUserId: user.id,
            provisionedAt: new Date(),
        },
    });

    return { ok: true, user, created: true };
}

/** Create or update portal user when HR sends onboarding with Zoho credentials. */
export async function ensurePortalUserForOnboarding(opts: {
    offer: OfferLetter;
    workEmail: string;
    password: string;
    signedName?: string | null;
}): Promise<{ user: Pick<User, "id" | "email" | "name" | "role">; created: boolean }> {
    const email = normalizeWorkEmail(opts.workEmail);
    if (!isNuriekWorkEmail(email)) {
        throw new Error("Work email must be a valid @nuriek.com address");
    }

    const employmentType = resolveOfferEmploymentType(opts.offer);
    const role: UserRole = isInternEmploymentType(employmentType) ? ROLES.INTERN : ROLES.EMPLOYEE;
    const displayName = opts.signedName?.trim() || opts.offer.candidateName;
    const hashedPassword = await bcrypt.hash(opts.password, 12);

    const existing = await prisma.user.findUnique({ where: { email } });

    if (existing) {
        const user = await prisma.user.update({
            where: { id: existing.id },
            data: {
                password: hashedPassword,
                mustChangePassword: true,
                onboardingStatus:
                    existing.onboardingStatus === "COMPLETED"
                        ? existing.onboardingStatus
                        : "IN_PROGRESS",
                name: existing.name || displayName,
            },
            select: { id: true, email: true, name: true, role: true },
        });

        await prisma.offerLetter.update({
            where: { id: opts.offer.id },
            data: {
                provisionedUserId: user.id,
                provisionedAt: opts.offer.provisionedAt ?? new Date(),
                onboardingWorkEmail: email,
            },
        });

        return { user, created: false };
    }

    const user = await prisma.user.create({
        data: {
            name: displayName,
            email,
            role,
            onboardingStatus: "IN_PROGRESS",
            mustChangePassword: true,
            password: hashedPassword,
            profile: {
                create: {
                    department: opts.offer.department || "General",
                    position: opts.offer.position,
                    joinDate: new Date(),
                },
            },
            ...(role === ROLES.INTERN
                ? {
                      internPerformance: {
                          create: {
                              onboardingData: JSON.stringify(DEFAULT_INTERN_ONBOARDING_CHECKLIST),
                              duration: "Month 1",
                          },
                      },
                  }
                : {}),
        },
        select: { id: true, email: true, name: true, role: true },
    });

    await prisma.offerLetter.update({
        where: { id: opts.offer.id },
        data: {
            provisionedUserId: user.id,
            provisionedAt: new Date(),
            onboardingWorkEmail: email,
        },
    });

    return { user, created: true };
}
