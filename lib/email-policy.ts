/** Work email policy — Nuriek Core accepts @nuriek.com only */

const BLOCKED_DOMAINS = [
    "gmail.com",
    "googlemail.com",
    "yahoo.com",
    "hotmail.com",
    "outlook.com",
    "icloud.com",
    "proton.me",
    "protonmail.com",
];

export const WORK_EMAIL_ERROR =
    "Only your @nuriek.com work email is allowed. Personal addresses (e.g. Gmail) cannot be used.";

export function normalizeWorkEmail(email: string): string {
    return email.trim().toLowerCase();
}

export function isNuriekWorkEmail(email: string): boolean {
    const normalized = normalizeWorkEmail(email);
    if (!normalized.endsWith("@nuriek.com")) return false;

    const domain = normalized.split("@")[1];
    if (!domain || domain !== "nuriek.com") return false;

    if (BLOCKED_DOMAINS.some((d) => normalized.includes(d))) return false;

    return true;
}
