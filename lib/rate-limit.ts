type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 10;

function pruneExpired(now: number) {
    for (const [key, bucket] of buckets) {
        if (bucket.resetAt <= now) buckets.delete(key);
    }
}

export function checkRateLimit(key: string): { allowed: boolean; retryAfterSec?: number } {
    const now = Date.now();
    pruneExpired(now);

    const bucket = buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
        buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
        return { allowed: true };
    }

    if (bucket.count >= MAX_ATTEMPTS) {
        return {
            allowed: false,
            retryAfterSec: Math.ceil((bucket.resetAt - now) / 1000),
        };
    }

    bucket.count += 1;
    return { allowed: true };
}

export function resetRateLimit(key: string) {
    buckets.delete(key);
}
