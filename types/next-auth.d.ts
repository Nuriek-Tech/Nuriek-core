import { DefaultSession } from "next-auth";
import type { Role } from "@/lib/constants";

declare module "next-auth" {
    interface Session {
        user: {
            id: string;
            role: Role;
            mustChangePassword: boolean;
            hrPermissions?: string | null;
        } & DefaultSession["user"];
    }

    interface User {
        id: string;
        role: Role;
        mustChangePassword?: boolean;
        hrPermissions?: string | null;
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        id: string;
        role: Role;
        mustChangePassword?: boolean;
        hrPermissions?: string | null;
    }
}
