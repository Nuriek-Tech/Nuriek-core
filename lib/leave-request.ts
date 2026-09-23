export const LEAVE_TYPES = ["CASUAL", "SICK", "EARNED"] as const;

export function parseLeaveDate(value: unknown): Date | null {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    const date = new Date(`${value}T12:00:00.000Z`);
    return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value ? null : date;
}

export function validateLeaveInput(input: unknown):
    | { ok: true; type: (typeof LEAVE_TYPES)[number]; start: Date; end: Date; reason: string | null }
    | { ok: false; error: string } {
    if (!input || typeof input !== "object" || Array.isArray(input)) return { ok: false, error: "Invalid leave request" };
    const body = input as Record<string, unknown>;
    if (!LEAVE_TYPES.includes(body.type as (typeof LEAVE_TYPES)[number])) return { ok: false, error: "Select a valid leave type" };
    const start = parseLeaveDate(body.startDate);
    const end = parseLeaveDate(body.endDate);
    if (!start || !end) return { ok: false, error: "Enter valid start and end dates" };
    if (end < start) return { ok: false, error: "End date must be on or after start date" };
    if (typeof body.reason !== "undefined" && typeof body.reason !== "string") return { ok: false, error: "Invalid leave reason" };
    const reason = typeof body.reason === "string" ? body.reason.trim() : "";
    if (reason.length > 1000) return { ok: false, error: "Reason must be 1000 characters or fewer" };
    return { ok: true, type: body.type as (typeof LEAVE_TYPES)[number], start, end, reason: reason || null };
}
