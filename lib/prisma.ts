import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

const globalForPrisma = global as unknown as { prisma?: PrismaClient };

function createPrismaClient() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
        throw new Error("DATABASE_URL is not set");
    }

    // Neon serverless driver (HTTP/WebSocket) — avoids TCP :5432 reachability issues.
    const adapter = new PrismaNeon({ connectionString });
    return new PrismaClient({ adapter });
}

/** Recreate client in dev when schema changes (e.g. new DocumentRead model) without restart. */
function getPrisma(): PrismaClient {
    const cached = globalForPrisma.prisma;
    const hasDocumentRead =
        cached && typeof (cached as PrismaClient & { documentRead?: unknown }).documentRead !== "undefined";

    if (cached && hasDocumentRead) {
        return cached;
    }

    const client = createPrismaClient();
    if (process.env.NODE_ENV !== "production") {
        globalForPrisma.prisma = client;
    }
    return client;
}

export const prisma = getPrisma();
