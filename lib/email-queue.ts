type EmailJob = () => Promise<{ success: boolean }>;

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1500;

async function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function sendWithRetry(
    job: EmailJob
): Promise<{ success: boolean; attempts: number; error?: unknown }> {
    let lastError: unknown;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            const result = await job();
            if (result.success) {
                return { success: true, attempts: attempt };
            }
        } catch (error) {
            lastError = error;
        }

        if (attempt < MAX_RETRIES) {
            await sleep(RETRY_DELAY_MS * attempt);
        }
    }

    console.error("[Email] All retries failed:", lastError);
    return { success: false, attempts: MAX_RETRIES, error: lastError };
}
