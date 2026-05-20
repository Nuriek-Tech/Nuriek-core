const STORAGE_KEY = "nuriek-dismissed-notifications";

export function loadDismissedNotificationIds(): Set<string> {
    if (typeof window === "undefined") return new Set();
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return new Set();
        const parsed = JSON.parse(raw) as string[];
        return new Set(Array.isArray(parsed) ? parsed : []);
    } catch {
        return new Set();
    }
}

export function saveDismissedNotificationIds(ids: Set<string>): void {
    if (typeof window === "undefined") return;
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
    } catch {
        /* quota */
    }
}

export function dismissNotificationIds(ids: string[]): void {
    const set = loadDismissedNotificationIds();
    for (const id of ids) set.add(id);
    saveDismissedNotificationIds(set);
}

export function clearAllDismissedNotifications(): void {
    if (typeof window === "undefined") return;
    try {
        localStorage.removeItem(STORAGE_KEY);
    } catch {
        /* ignore */
    }
}
