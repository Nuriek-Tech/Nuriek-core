/** Persisted HR signatory defaults for the offer letter generator (browser localStorage). */

export const HR_SIGNATORY_PREFS_KEY = "nuriek-offer-hr-signatory";

export type HrSignatoryPrefs = {
    hrSignatory: string;
    hrSignatoryTitle: string;
    hrSignatureDataUrl: string;
};

const DEFAULT_PREFS: HrSignatoryPrefs = {
    hrSignatory: "",
    hrSignatoryTitle: "Human Resources",
    hrSignatureDataUrl: "",
};

export function loadHrSignatoryPrefs(): HrSignatoryPrefs | null {
    if (typeof window === "undefined") return null;
    try {
        const raw = localStorage.getItem(HR_SIGNATORY_PREFS_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as Partial<HrSignatoryPrefs>;
        return {
            hrSignatory: String(parsed.hrSignatory ?? ""),
            hrSignatoryTitle: String(parsed.hrSignatoryTitle ?? DEFAULT_PREFS.hrSignatoryTitle),
            hrSignatureDataUrl: String(parsed.hrSignatureDataUrl ?? ""),
        };
    } catch {
        return null;
    }
}

/** Migrate legacy signature-only cache key. */
export function loadLegacySignatureOnly(): string | null {
    if (typeof window === "undefined") return null;
    try {
        const legacy = localStorage.getItem("nuriek-hr-signature-dataurl");
        return legacy?.trim() || null;
    } catch {
        return null;
    }
}

export function saveHrSignatoryPrefs(prefs: HrSignatoryPrefs): void {
    if (typeof window === "undefined") return;
    try {
        localStorage.setItem(HR_SIGNATORY_PREFS_KEY, JSON.stringify(prefs));
        localStorage.removeItem("nuriek-hr-signature-dataurl");
    } catch {
        /* quota or private mode */
    }
}

export function clearHrSignatoryPrefs(): void {
    if (typeof window === "undefined") return;
    try {
        localStorage.removeItem(HR_SIGNATORY_PREFS_KEY);
        localStorage.removeItem("nuriek-hr-signature-dataurl");
    } catch {
        /* ignore */
    }
}

export function hasSavedHrSignatoryPrefs(prefs: HrSignatoryPrefs): boolean {
    return Boolean(
        prefs.hrSignatory.trim() ||
            prefs.hrSignatoryTitle.trim() ||
            prefs.hrSignatureDataUrl.trim()
    );
}
