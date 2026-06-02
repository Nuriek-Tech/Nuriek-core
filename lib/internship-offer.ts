/** Internship offer variants — paid, unpaid review period, or no monetary compensation. */

export const INTERNSHIP_TYPES = {
    PAID: "paid",
    /** Unpaid for an initial period; optional future payment after review */
    UNPAID: "unpaid",
    /** Entire internship — no monetary compensation in the offer */
    NO_MONETARY: "no_monetary",
} as const;

export type InternshipType = (typeof INTERNSHIP_TYPES)[keyof typeof INTERNSHIP_TYPES];

/** Default months before stipend review (unpaid track). */
export const DEFAULT_STIPEND_AFTER_MONTHS = 3;

export const INTERNSHIP_DURATION_OPTIONS = [3, 6, 9, 12] as const;

export function resolveInternshipMonths(value: unknown, fallback = 6): number {
    const n = Number(value);
    if (!Number.isFinite(n) || n < 1) return fallback;
    return Math.min(24, Math.max(1, Math.round(n)));
}

export function resolveStipendAfterMonths(value: unknown, fallback = DEFAULT_STIPEND_AFTER_MONTHS): number {
    const n = Number(value);
    if (!Number.isFinite(n) || n < 1) return fallback;
    return Math.min(12, Math.max(1, Math.round(n)));
}

export function normalizeInternshipType(
    value: string | null | undefined
): InternshipType | null {
    if (!value) return null;
    const v = value.trim().toLowerCase();
    if (v === INTERNSHIP_TYPES.PAID || v === "paid internship") return INTERNSHIP_TYPES.PAID;
    if (
        v === INTERNSHIP_TYPES.NO_MONETARY ||
        v === "no_monetary" ||
        v === "no monetary" ||
        v === "no payment" ||
        v === "no pay" ||
        v === "none"
    ) {
        return INTERNSHIP_TYPES.NO_MONETARY;
    }
    if (v === INTERNSHIP_TYPES.UNPAID || v === "unpaid" || v === "non-paid" || v === "nonpaid") {
        return INTERNSHIP_TYPES.UNPAID;
    }
    return null;
}

export function isUnpaidInternship(type: string | null | undefined): boolean {
    return normalizeInternshipType(type) === INTERNSHIP_TYPES.UNPAID;
}

export function isNoMonetaryInternship(type: string | null | undefined): boolean {
    return normalizeInternshipType(type) === INTERNSHIP_TYPES.NO_MONETARY;
}

/** Unpaid review period or fully non-monetary — no stipend from day one */
export function isNonPaidInternship(type: string | null | undefined): boolean {
    const t = normalizeInternshipType(type);
    return t === INTERNSHIP_TYPES.UNPAID || t === INTERNSHIP_TYPES.NO_MONETARY;
}

export function internshipTypeLabel(
    type: string | null | undefined,
    internshipMonths?: number | null
): string {
    const mo =
        internshipMonths && internshipMonths > 0 ? ` · ${internshipMonths} mo` : "";
    if (isNoMonetaryInternship(type)) return `No monetary${mo}`;
    if (isUnpaidInternship(type)) return `Unpaid then review${mo}`;
    if (normalizeInternshipType(type) === INTERNSHIP_TYPES.PAID) return `Paid${mo}`;
    return internshipMonths ? `Intern · ${internshipMonths} mo` : "Intern";
}

export function defaultInternshipTypeForEmployment(
    employmentType: string | null | undefined
): InternshipType | null {
    if (employmentType?.trim().toLowerCase() !== "intern") return null;
    return INTERNSHIP_TYPES.PAID;
}

/** Resolve letter track when internshipType was omitted (legacy offers / old forms). */
export function resolveInternOfferTrack(params: {
    employmentType?: string;
    internshipType?: string | null;
    compensation?: string;
    includeFuturePaymentAmount?: boolean;
}): InternshipType {
    const explicit = normalizeInternshipType(params.internshipType);
    if (explicit) return explicit;

    if (params.employmentType?.trim().toLowerCase() !== "intern") {
        return INTERNSHIP_TYPES.PAID;
    }

    if (params.includeFuturePaymentAmount) {
        return INTERNSHIP_TYPES.UNPAID;
    }

    if (!isMeaningfulOfferAmount(params.compensation)) {
        return INTERNSHIP_TYPES.NO_MONETARY;
    }

    return INTERNSHIP_TYPES.PAID;
}

/** True when compensation text is a real amount (not blank, zero, or placeholder). */
export function isMeaningfulOfferAmount(value: string | null | undefined): boolean {
    const trimmed = (value ?? "").trim();
    if (!trimmed) return false;

    const lower = trimmed.toLowerCase().replace(/,/g, "");
    if (lower === "0" || lower === "rs. 0" || lower === "rs 0" || lower === "inr 0") {
        return false;
    }

    const digitsOnly = lower.replace(/[^0-9.]/g, "");
    if (digitsOnly === "0" || digitsOnly === "0.0") return false;

    return true;
}

/** Compensation string for intern offer HTML — never pull grade hints for non-paid tracks */
export function resolveInternOfferCompensation(params: {
    employmentType?: string;
    internshipType?: string | null;
    compensation?: string;
    includeFuturePaymentAmount?: boolean;
}): string {
    const trimmed = (params.compensation ?? "").trim();
    if (params.employmentType?.trim().toLowerCase() !== "intern") return trimmed;

    if (isNoMonetaryInternship(params.internshipType)) return "";
    if (isUnpaidInternship(params.internshipType)) {
        if (!params.includeFuturePaymentAmount) return "";
        return isMeaningfulOfferAmount(trimmed) ? trimmed : "";
    }
    return trimmed;
}
