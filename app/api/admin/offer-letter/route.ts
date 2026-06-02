import { NextResponse } from "next/server";
import { requireHrPermission, isNextResponse } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import {
    buildOfferLetterHtml,
    buildOfferLetterRef,
    buildOfferLetterToken,
    isInternEmploymentType,
    offerLetterViewPath,
    type OfferLetterInput,
} from "@/lib/offer-letter";
import {
    INTERNSHIP_TYPES,
    normalizeInternshipType,
    resolveInternshipMonths,
    resolveStipendAfterMonths,
    resolveInternOfferCompensation,
} from "@/lib/internship-offer";
import { getOrgHrSignatory, resolveHrSignatureForOffer } from "@/lib/offer-hr-signature-org";
import { parseOfferLocalDate } from "@/lib/offer-letter-intern";

function isOfferLetterModelMissing(error: unknown): boolean {
    if (!(error instanceof Error)) return false;
    const msg = error.message.toLowerCase();
    return (
        msg.includes("offerletter") ||
        msg.includes("cannot read properties of undefined") ||
        msg.includes("invalid `prisma.offerletter")
    );
}

export async function POST(req: Request) {
    const user = await requireHrPermission("offer_letter");
    if (isNextResponse(user)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await req.json();

        const candidateName = String(body.candidateName || "").trim();
        const position = String(body.position || "").trim();
        const department = String(body.department || "General").trim();
        const employmentType = String(body.employmentType || "Full-time").trim();
        const joiningDate = String(body.joiningDate || "").trim();
        const reportingTo = String(body.reportingTo || "HR / Reporting Manager").trim();
        const workLocation = String(body.workLocation || "Bangalore (HQ)").trim();
        const offerValidUntil = String(body.offerValidUntil || "").trim();
        const orgHr = await getOrgHrSignatory();
        const hrSignatory = String(
            body.hrSignatory || orgHr.hrSignatory || user.name || "HR Manager"
        ).trim();

        const probationMonths = Math.max(0, Number(body.probationMonths) || 3);
        const candidateEmail = body.candidateEmail ? String(body.candidateEmail).trim() : undefined;
        const internshipType = isInternEmploymentType(employmentType)
            ? normalizeInternshipType(body.internshipType) ?? INTERNSHIP_TYPES.PAID
            : null;
        const internshipMonths = isInternEmploymentType(employmentType)
            ? resolveInternshipMonths(body.internshipMonths)
            : undefined;
        const stipendAfterMonths =
            isInternEmploymentType(employmentType) && internshipType === INTERNSHIP_TYPES.UNPAID
                ? resolveStipendAfterMonths(body.stipendAfterMonths)
                : null;
        const includeFuturePaymentAmount = Boolean(body.includeFuturePaymentAmount);
        const compensation = resolveInternOfferCompensation({
            employmentType,
            internshipType,
            compensation: String(body.compensation || "").trim(),
            includeFuturePaymentAmount,
        });

        if (!candidateName || !position || !joiningDate || !offerValidUntil) {
            return NextResponse.json(
                {
                    error: "Candidate name, position, joining date, and offer validity are required",
                },
                { status: 400 }
            );
        }

        if (
            isInternEmploymentType(employmentType) &&
            internshipType === INTERNSHIP_TYPES.PAID &&
            !compensation
        ) {
            return NextResponse.json({ error: "Stipend is required for paid internships" }, { status: 400 });
        }

        if (!isInternEmploymentType(employmentType) && !compensation) {
            return NextResponse.json({ error: "Compensation is required" }, { status: 400 });
        }

        const payload: OfferLetterInput = {
            candidateName,
            candidateEmail,
            candidateAddress: body.candidateAddress ? String(body.candidateAddress).trim() : undefined,
            candidateCity: body.candidateCity ? String(body.candidateCity).trim() : undefined,
            position,
            department,
            employmentType,
            internshipType,
            internshipMonths,
            stipendAfterMonths: stipendAfterMonths ?? undefined,
            includeFuturePaymentAmount,
            compensation,
            salaryGrade: body.salaryGrade ? String(body.salaryGrade).trim() : undefined,
            bonusNote: body.bonusNote ? String(body.bonusNote).trim() : undefined,
            joiningDate,
            reportingTo,
            workLocation,
            probationMonths,
            offerValidUntil,
            hrSignatory,
            hrSignatoryTitle: body.hrSignatoryTitle
                ? String(body.hrSignatoryTitle).trim()
                : orgHr.hrSignatoryTitle || "Human Resources",
            additionalTerms: body.additionalTerms ? String(body.additionalTerms) : undefined,
            appendCustomRoleDesignation: Boolean(body.appendCustomRoleDesignation),
            customRoleDesignation: body.customRoleDesignation
                ? String(body.customRoleDesignation).trim()
                : undefined,
            hrSignatureDataUrl:
                (await resolveHrSignatureForOffer(
                    body.hrSignatureDataUrl ? String(body.hrSignatureDataUrl).trim() : null
                )) || undefined,
            refNumber: buildOfferLetterRef(),
            issueDate: new Date().toISOString(),
        };

        const html = buildOfferLetterHtml(payload);
        const token = buildOfferLetterToken();
        const joiningDateParsed = parseOfferLocalDate(joiningDate);
        const expiresAt = new Date(offerValidUntil);
        if (!Number.isNaN(expiresAt.getTime())) {
            expiresAt.setHours(23, 59, 59, 999);
        }

        let savedToken: string | null = token;
        let warning: string | undefined;

        try {
            await prisma.offerLetter.create({
                data: {
                    token,
                    refNumber: payload.refNumber,
                    candidateName,
                    candidateEmail: candidateEmail || null,
                    position,
                    department,
                    employmentType,
                    internshipType,
                    internshipMonths: internshipMonths ?? null,
                    stipendAfterMonths,
                    joiningDate: joiningDateParsed,
                    html,
                    status: "GENERATED",
                    createdById: user.id,
                    expiresAt: Number.isNaN(expiresAt.getTime()) ? null : expiresAt,
                },
            });

            await logAudit({
                actorId: user.id,
                actorEmail: user.email,
                action: "DOCUMENT_UPLOAD",
                entity: "OfferLetter",
                metadata: {
                    ref: payload.refNumber,
                    candidate: candidateName,
                    position,
                    token,
                },
            });
        } catch (dbError) {
            console.error("Offer letter DB save error:", dbError);
            savedToken = null;
            if (isOfferLetterModelMissing(dbError)) {
                warning =
                    "Preview and PDF work, but the offer was not saved for email links. Run: npx prisma generate — then restart npm run dev.";
            } else {
                warning =
                    "Preview and PDF work, but saving to the database failed. Check your database connection or run: npx prisma db push";
            }
        }

        return NextResponse.json({
            html,
            refNumber: payload.refNumber,
            candidateName: payload.candidateName,
            token: savedToken,
            viewPath: savedToken ? offerLetterViewPath(savedToken) : null,
            internshipMonths: internshipMonths ?? null,
            warning,
        });
    } catch (error) {
        console.error("Offer letter generate error:", error);
        const message =
            error instanceof Error ? error.message : "Failed to generate offer letter";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
