/** Shared helpers for operational report APIs */

export function monthRange(month: string): { start: Date; end: Date } | null {
    const match = /^(\d{4})-(\d{2})$/.exec(month);
    if (!match) return null;
    const year = Number(match[1]);
    const monthNum = Number(match[2]);
    if (monthNum < 1 || monthNum > 12) return null;
    return {
        start: new Date(year, monthNum - 1, 1),
        end: new Date(year, monthNum, 0, 23, 59, 59, 999),
    };
}

export function lastNDays(n: number): { label: string; start: Date; end: Date }[] {
    const days: { label: string; start: Date; end: Date }[] = [];
    for (let i = n - 1; i >= 0; i--) {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        d.setDate(d.getDate() - i);
        const end = new Date(d);
        end.setHours(23, 59, 59, 999);
        days.push({
            label: d.toLocaleDateString("en-US", { weekday: "short" }),
            start: d,
            end,
        });
    }
    return days;
}

export function hoursBetween(checkIn: Date, checkOut: Date | null): number {
    if (!checkOut) return 0;
    return (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60);
}
