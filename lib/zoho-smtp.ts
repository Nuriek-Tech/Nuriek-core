import nodemailer from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport";

/** India Zoho Mail — use smtp.zoho.com if your mailbox is on Zoho US/global. */
const DEFAULT_ZOHO_HOST = "smtp.zoho.in";

/** Default outbound mailbox (must match ZOHO_USER in .env). */
export const DEFAULT_ZOHO_SENDER_EMAIL = "admin@nuriek.com";

/** Strip whitespace and optional wrapping quotes (common .env / Vercel copy-paste mistakes). */
export function normalizeZohoEnvValue(value: string | undefined): string {
    let v = (value ?? "").trim();
    if (
        (v.startsWith('"') && v.endsWith('"')) ||
        (v.startsWith("'") && v.endsWith("'"))
    ) {
        v = v.slice(1, -1);
    }
    return v;
}

export function zohoSmtpHost(): string {
    const raw = normalizeZohoEnvValue(process.env.ZOHO_SMTP_HOST);
    if (raw === "in" || raw === "india") return "smtp.zoho.in";
    if (raw === "us" || raw === "com" || raw === "global") return "smtp.zoho.com";
    return raw || DEFAULT_ZOHO_HOST;
}

export function zohoSmtpPort(): number {
    const port = Number(normalizeZohoEnvValue(process.env.ZOHO_SMTP_PORT) || "465");
    return Number.isFinite(port) ? port : 465;
}

export function zohoSmtpUser(): string {
    return normalizeZohoEnvValue(process.env.ZOHO_USER).toLowerCase();
}

export function zohoSmtpPassword(): string {
    return normalizeZohoEnvValue(process.env.ZOHO_PASSWORD);
}

export function isZohoConfigured(): boolean {
    return Boolean(zohoSmtpUser() && zohoSmtpPassword());
}

export function zohoFromAddress(): string {
    return zohoSmtpUser();
}

/** RFC5322 From header for outbound mail. */
export function zohoMailFrom(): string {
    const display = process.env.ZOHO_FROM_NAME?.trim() || "nuriek";
    return `"${display}" <${zohoFromAddress()}>`;
}

export function createZohoTransporter() {
    const user = zohoSmtpUser();
    const pass = zohoSmtpPassword();

    if (!user || !pass) {
        throw new Error("ZOHO_USER and ZOHO_PASSWORD must be set in .env");
    }

    const port = zohoSmtpPort();
    const host = zohoSmtpHost();
    const options: SMTPTransport.Options = {
        host,
        port,
        secure: port === 465,
        requireTLS: port === 587,
        auth: { user, pass },
        tls: { minVersion: "TLSv1.2" },
    };

    return nodemailer.createTransport(options);
}

/** SMTP verify — use from scripts/diagnostics (does not send mail). */
export async function verifyZohoSmtpConnection(): Promise<void> {
    const transport = createZohoTransporter();
    await transport.verify();
}

/** User-facing hint when Zoho returns 535 / EAUTH. */
export function formatZohoSmtpError(error: unknown): string {
    const err = error as { code?: string; responseCode?: number; response?: string };
    const isAuth =
        err?.code === "EAUTH" ||
        err?.responseCode === 535 ||
        String(err?.response || "").includes("535");

    if (isAuth) {
        const host = zohoSmtpHost();
        const altHost =
            host === "smtp.zoho.in" ? "smtp.zoho.com" : "smtp.zoho.in";
        return [
            "Zoho SMTP login failed (535 Authentication Failed).",
            `ZOHO_USER must be the full mailbox (e.g. ${DEFAULT_ZOHO_SENDER_EMAIL}) — no spaces or quotes.`,
            "ZOHO_PASSWORD must be a Zoho App Password (16 characters), not your webmail login password.",
            "In Zoho Mail → Settings → Security → App passwords → generate for SMTP / “Nuriek Core”.",
            "Enable IMAP/SMTP access for the mailbox if your admin policy requires it.",
            `Current SMTP: ${host}:${zohoSmtpPort()}. If login still fails, try ZOHO_SMTP_HOST=${altHost} (India vs US datacenter).`,
            "On Vercel: set the same variables under Project → Settings → Environment Variables, then redeploy.",
        ].join(" ");
    }

    if (error instanceof Error && error.message) {
        return error.message;
    }
    return "Failed to send email via Zoho SMTP.";
}
