import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { ROLES, type Role } from "./constants";
import { prisma } from "./prisma";
import { checkRateLimit, resetRateLimit } from "./rate-limit";
import { logAudit } from "./audit";
import { normalizeRole } from "./roles";
import { isNuriekWorkEmail, normalizeWorkEmail } from "./email-policy";
import { startLoginSession, endLoginSessionById } from "./session-tracking";

async function loadUserForToken(email?: string | null, id?: string | null) {
    if (id) {
        return prisma.user.findUnique({
            where: { id },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                mustChangePassword: true,
                hrPermissions: true,
                isActive: true,
            },
        });
    }
    if (email) {
        return prisma.user.findUnique({
            where: { email },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                mustChangePassword: true,
                hrPermissions: true,
                isActive: true,
            },
        });
    }
    return null;
}

export const authOptions: NextAuthOptions = {
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) return null;

                const email = normalizeWorkEmail(credentials.email);
                if (!isNuriekWorkEmail(email)) return null;

                const limit = checkRateLimit(`login:${email}`);
                if (!limit.allowed) {
                    throw new Error("TooManyAttempts");
                }

                try {
                    const user = await prisma.user.findUnique({
                        where: { email },
                    });

                    if (!user || !user.password) return null;
                    if (!user.isActive) return null;

                    const isPasswordMatch = await bcrypt
                        .compare(credentials.password, user.password)
                        .catch(() => false);

                    if (!isPasswordMatch) return null;

                    resetRateLimit(`login:${email}`);

                    await logAudit({
                        actorId: user.id,
                        actorEmail: user.email,
                        action: "LOGIN",
                        entity: "User",
                        entityId: user.id,
                    });

                    const loginSession = await startLoginSession(user.id);

                    return {
                        id: user.id,
                        name: user.name,
                        email: user.email,
                        role: normalizeRole(user.role) ?? ROLES.EMPLOYEE,
                        mustChangePassword: user.mustChangePassword,
                        hrPermissions: user.hrPermissions,
                        loginSessionId: loginSession.id,
                    };
                } catch (err) {
                    const msg = err instanceof Error ? err.message : "";
                    const isDbUnreachable =
                        msg.includes("Can't reach database server") ||
                        msg.includes("P1001") ||
                        msg.includes("PrismaClientInitializationError");
                    if (isDbUnreachable) {
                        throw new Error("DatabaseUnavailable");
                    }
                    if (msg === "TooManyAttempts") throw err;
                    console.error("Login authorize error:", err);
                    return null;
                }
            },
        }),
    ],
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
                token.email = user.email;
                token.role = user.role || ROLES.EMPLOYEE;
                token.mustChangePassword = user.mustChangePassword ?? false;
                token.hrPermissions = user.hrPermissions ?? null;
                token.loginSessionId = user.loginSessionId ?? null;
                token.lastSync = Date.now();
                return token;
            }

            const lastSync = (token.lastSync as number | undefined) ?? 0;
            const SYNC_INTERVAL_MS = 5 * 60 * 1000;
            if (Date.now() - lastSync < SYNC_INTERVAL_MS) {
                return token;
            }

            const dbUser = await loadUserForToken(
                (token.email as string) ?? null,
                (token.id as string) ?? null
            );

            if (dbUser) {
                if (!dbUser.isActive) {
                    token.id = "";
                    token.email = "";
                    token.error = "AccountDisabled";
                    return token;
                }
                token.id = dbUser.id;
                token.email = dbUser.email;
                token.role = normalizeRole(dbUser.role) ?? ROLES.EMPLOYEE;
                token.mustChangePassword = dbUser.mustChangePassword;
                token.hrPermissions = dbUser.hrPermissions ?? null;
            }

            token.lastSync = Date.now();
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                session.user.id = token.id as string;
                session.user.role = (normalizeRole(token.role as string) ?? ROLES.EMPLOYEE) as Role;
                session.user.mustChangePassword = Boolean(token.mustChangePassword);
                session.user.hrPermissions =
                    (token.hrPermissions as string | null | undefined) ?? null;
            }
            return session;
        },
    },
    pages: {
        signIn: "/login",
    },
    session: {
        strategy: "jwt",
        maxAge: 30 * 24 * 60 * 60,
    },
    events: {
        async signOut({ token }) {
            const sessionId = token?.loginSessionId;
            if (sessionId && typeof sessionId === "string") {
                await endLoginSessionById(sessionId, "logout");
            }
        },
    },
    secret: process.env.NEXTAUTH_SECRET,
};
