/** Internship offer variants — paid from day one vs unpaid until after review period. */

export const INTERNSHIP_TYPES = {
    PAID: "paid",
    UNPAID: "unpaid",
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
    if (v === INTERNSHIP_TYPES.UNPAID || v === "unpaid" || v === "non-paid" || v === "nonpaid") {
        return INTERNSHIP_TYPES.UNPAID;
    }
    return null;
}

export function isUnpaidInternship(type: string | null | undefined): boolean {
    return normalizeInternshipType(type) === INTERNSHIP_TYPES.UNPAID;
}

export function internshipTypeLabel(
    type: string | null | undefined,
    internshipMonths?: number | null
): string {
    const mo =
        internshipMonths && internshipMonths > 0 ? ` · ${internshipMonths} mo` : "";
    if (isUnpaidInternship(type)) return `Learning programme${mo}`;
    if (normalizeInternshipType(type) === INTERNSHIP_TYPES.PAID) return `Paid${mo}`;
    return internshipMonths ? `Intern · ${internshipMonths} mo` : "Intern";
}

export function defaultInternshipTypeForEmployment(
    employmentType: string | null | undefined
): InternshipType | null {
    if (employmentType?.trim().toLowerCase() !== "intern") return null;
    return INTERNSHIP_TYPES.PAID;
}
