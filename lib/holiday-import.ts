export type ParsedHolidayRow = {
    name: string;
    date: Date;
    type: string;
};

const VALID_TYPES = new Set(["PUBLIC", "OPTIONAL", "COMPANY"]);

function parseDateCell(raw: string): Date | null {
    const s = raw.trim();
    if (!s) return null;

    const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
    if (iso) {
        const d = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
        return Number.isNaN(d.getTime()) ? null : d;
    }

    const dmy = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/.exec(s);
    if (dmy) {
        const d = new Date(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1]));
        return Number.isNaN(d.getTime()) ? null : d;
    }

    const parsed = new Date(s);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function splitLine(line: string): string[] {
    if (line.includes("\t")) return line.split("\t").map((c) => c.trim());
    return line.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
}

/**
 * Parse CSV/TSV holiday list: name, date [, type]
 * Header row optional (name, date, type).
 */
export function parseHolidayList(text: string): {
    rows: ParsedHolidayRow[];
    errors: string[];
} {
    const errors: string[] = [];
    const rows: ParsedHolidayRow[] = [];
    const lines = text
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter((l) => l.length > 0 && !l.startsWith("#"));

    let start = 0;
    if (lines[0] && /^name/i.test(lines[0])) {
        start = 1;
    }

    for (let i = start; i < lines.length; i++) {
        const cols = splitLine(lines[i]!);
        if (cols.length < 2) {
            errors.push(`Line ${i + 1}: need at least name and date`);
            continue;
        }

        const name = cols[0]?.trim();
        const dateRaw = cols[1] ?? "";
        const typeRaw = (cols[2] ?? "PUBLIC").trim().toUpperCase() || "PUBLIC";

        if (!name) {
            errors.push(`Line ${i + 1}: missing holiday name`);
            continue;
        }

        const date = parseDateCell(dateRaw);
        if (!date) {
            errors.push(`Line ${i + 1}: invalid date "${dateRaw}"`);
            continue;
        }

        const type = VALID_TYPES.has(typeRaw) ? typeRaw : "PUBLIC";
        rows.push({ name, date, type });
    }

    return { rows, errors };
}

export function calendarYearOf(d: Date): number {
    return d.getFullYear();
}
