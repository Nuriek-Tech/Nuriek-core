/** Start date for tenure: profile join date, else account created. */
export function resolveInternStartDate(
    joinDate: Date | string | null | undefined,
    createdAt: Date | string
): Date {
    if (joinDate) return new Date(joinDate);
    return new Date(createdAt);
}

/** Whole calendar days since start (inclusive of start day as day 0). */
export function daysInSystem(start: Date, asOf: Date = new Date()): number {
    const startUtc = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
    const endUtc = Date.UTC(asOf.getFullYear(), asOf.getMonth(), asOf.getDate());
    return Math.max(0, Math.floor((endUtc - startUtc) / (1000 * 60 * 60 * 24)));
}

export function formatTenure(days: number): string {
    if (days === 0) return "Joined today";
    if (days === 1) return "1 day in system";
    if (days < 30) return `${days} days in system`;
    const months = Math.floor(days / 30);
    const rem = days % 30;
    if (months < 12) {
        if (rem === 0) return `${months} month${months === 1 ? "" : "s"} in system`;
        return `${months} mo ${rem} d in system`;
    }
    const years = Math.floor(days / 365);
    const drem = days % 365;
    return `${years} yr${years === 1 ? "" : "s"}, ${drem} d in system`;
}
