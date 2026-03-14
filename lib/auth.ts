import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

import bcrypt from "bcryptjs";
import { ROLES } from "./constants";
import { prisma } from "./prisma";

interface UserWithRole {
    id: string;
    name?: string | null;
    email?: string | null;
    role: string;
}

export const authOptions: NextAuthOptions = {
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email", placeholder: "arun@nuriek.com" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) return null;

                // Enforce nuriek.com domain
                if (!credentials.email.endsWith("@nuriek.com")) {
                    return null;
                }

                const user = await prisma.user.findUnique({
                    where: { email: credentials.email },
                });

                if (!user || !user.password) return null;

                // Support both plain text (legacy) and hashed passwords during transition
                // Support both plain text (legacy) and hashed passwords during transition
                let isPasswordMatch = user.password === credentials.password;
                if (!isPasswordMatch) {
                    // Check if it's a valid hash or just a mismatch
                    isPasswordMatch = await bcrypt.compare(credentials.password, user.password).catch(() => false);
                }

                console.log(`[Auth] Login attempt for ${credentials.email}: Match=${isPasswordMatch}`);

                if (isPasswordMatch) {
                    return {
                        id: user.id,
                        name: user.name,
                        email: user.email,
                        role: user.role,
                    };
                }
                return null;
            },
        }),
    ],
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.role = (user as UserWithRole).role || ROLES.EMPLOYEE;
                token.id = user.id;
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                (session.user as UserWithRole).role = token.role as string;
                (session.user as UserWithRole).id = token.id as string;
            }
            return session;
        },
        async signIn({ user, account }) {
            return true;
        }
    },
    pages: {
        signIn: "/login",
    },
    session: {
        strategy: "jwt",
    },
    secret: process.env.NEXTAUTH_SECRET,
};
