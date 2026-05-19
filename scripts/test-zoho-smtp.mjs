/**
 * Test Zoho SMTP credentials (verify only — does not send email).
 * Usage: node scripts/test-zoho-smtp.mjs
 * Optional: ZOHO_SMTP_HOST=smtp.zoho.com node scripts/test-zoho-smtp.mjs
 */
import dotenv from "dotenv";
import nodemailer from "nodemailer";

dotenv.config();

function normalize(value) {
    let v = (value ?? "").trim();
    if (
        (v.startsWith('"') && v.endsWith('"')) ||
        (v.startsWith("'") && v.endsWith("'"))
    ) {
        v = v.slice(1, -1);
    }
    return v;
}

const user = normalize(process.env.ZOHO_USER).toLowerCase();
const pass = normalize(process.env.ZOHO_PASSWORD);
const host = normalize(process.env.ZOHO_SMTP_HOST) || "smtp.zoho.in";
const port = Number(normalize(process.env.ZOHO_SMTP_PORT) || "465");

if (!user || !pass) {
    console.error("Missing ZOHO_USER or ZOHO_PASSWORD in .env");
    process.exit(1);
}

console.log("Zoho SMTP diagnostic");
console.log("  ZOHO_USER:", user);
console.log("  ZOHO_PASSWORD length:", pass.length, "(app passwords are usually 16 chars)");
console.log("  ZOHO_SMTP_HOST:", host);
console.log("  ZOHO_SMTP_PORT:", port);

const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    requireTLS: port === 587,
    auth: { user, pass },
    tls: { minVersion: "TLSv1.2" },
});

try {
    await transporter.verify();
    console.log("\nOK — SMTP login succeeded. You can send mail from the portal.");
} catch (error) {
    console.error("\nFAILED —", error?.message || error);
    if (String(error?.response || "").includes("535")) {
        console.error(`
Fix checklist:
  1. ZOHO_USER=${user} (full email, must own this mailbox)
  2. Regenerate App Password in Zoho Mail → Security → App passwords
  3. Paste password with NO spaces; in .env do not add extra quotes
  4. If mailbox is on Zoho US: ZOHO_SMTP_HOST=smtp.zoho.com
  5. If on Zoho India:  ZOHO_SMTP_HOST=smtp.zoho.in
  6. Try port 587:       ZOHO_SMTP_PORT=587
  7. On Vercel: copy same vars to Environment Variables and redeploy
`);
    }
    process.exit(1);
}
