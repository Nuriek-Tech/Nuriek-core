/**
 * Quick Neon connectivity check (HTTP driver — same as Neon's sample).
 * Run: npm run test:neon
 * Does not start a server on port 3000 (avoids clashing with Next.js).
 */
import "dotenv/config";
import { neon } from "@neondatabase/serverless";

const url = process.env.DATABASE_URL;
if (!url) {
    console.error("DATABASE_URL is missing in .env");
    process.exit(1);
}

const sql = neon(url);

try {
    const rows = await sql`SELECT version()`;
    console.log("Neon OK:", rows[0]?.version);
    process.exit(0);
} catch (err) {
    console.error("Neon FAILED:", err.message);
    process.exit(1);
}
