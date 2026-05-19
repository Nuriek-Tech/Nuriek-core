import nodemailer from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport";

/** India Zoho Mail — use smtp.zoho.com if your mailbox is on Zoho US/global. */
const DEFAULT_ZOHO_HOST = "smtp.zoho.in";

/** Default outbound mailbox (must match ZOHO_USER in .env). */
export const DEFAULT_ZOHO_SENDER_EMAIL = "admin@nuriek.com";

export function zohoSmtpHost(): string {
    return (process.env.ZOHO_SMTP_HOST || DEFAULT_ZOHO_HOST).trim();
}

export function zohoSmtpPort(): number {
    const port = Number(process.env.ZOHO_SMTP_PORT || "465");
    return Number.isFinite(port) ? port : 465;
}

export function isZohoConfigured(): boolean {
    return Boolean(process.env.ZOHO_USER?.trim() && process.env.ZOHO_PASSWORD);
}

export function zohoFromAddress(): string {
    return process.env.ZOHO_USER!.trim();
}

/** RFC5322 From header for outbound mail. */
export function zohoMailFrom(): string {
    const display = process.env.ZOHO_FROM_NAME?.trim() || "nuriek";
    return `"${display}" <${zohoFromAddress()}>`;
}

export function createZohoTransporter() {
    const user = process.env.ZOHO_USER?.trim();
    const pass = process.env.ZOHO_PASSWORD;

    if (!user || !pass) {
        throw new Error("ZOHO_USER and ZOHO_PASSWORD must be set in .env");
    }

    const port = zohoSmtpPort();
    const options: SMTPTransport.Options = {
        host: zohoSmtpHost(),
        port,
        secure: port === 465,
        auth: { user, pass },
    };

    return nodemailer.createTransport(options);
}

/** User-facing hint when Zoho returns 535 / EAUTH. */
export function formatZohoSmtpError(error: unknown): string {
    const err = error as { code?: string; responseCode?: number; response?: string };
    const isAuth =
        err?.code === "EAUTH" ||
        err?.responseCode === 535 ||
        String(err?.response || "").includes("535");

    if (isAuth) {
        return [
            "Zoho SMTP login failed (535 Authentication Failed).",
            `Use the full mailbox as ZOHO_USER (e.g. ${DEFAULT_ZOHO_SENDER_EMAIL}).`,
            "Use a Zoho App Password — not your normal webmail password.",
            "In Zoho Mail: Security → App passwords → generate one for “Nuriek Core”.",
            `SMTP host is ${zohoSmtpHost()} — if your org uses US Zoho, set ZOHO_SMTP_HOST=smtp.zoho.com in .env and restart.`,
        ].join(" ");
    }

    if (error instanceof Error && error.message) {
        return error.message;
    }
    return "Failed to send email via Zoho SMTP.";
}
