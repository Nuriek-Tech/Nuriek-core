"use client";

import { useEffect, useMemo } from "react";
import { useSession } from "next-auth/react";
import { ROLES, type Role } from "@/lib/constants";
import { normalizeRole } from "@/lib/roles";

const ROLE_STORAGE_KEY = "nuriek-session-role";
const HR_PERMS_STORAGE_KEY = "nuriek-session-hr-perms";

export function useStableSessionRole() {
    const { data: session, status } = useSession();

    const liveRole = session?.user?.role;
    const liveHrPerms = session?.user?.hrPermissions ?? null;

    useEffect(() => {
        if (liveRole) {
            sessionStorage.setItem(ROLE_STORAGE_KEY, liveRole);
        }
        if (liveHrPerms !== undefined && liveHrPerms !== null) {
            sessionStorage.setItem(HR_PERMS_STORAGE_KEY, liveHrPerms);
        } else if (liveRole) {
            sessionStorage.removeItem(HR_PERMS_STORAGE_KEY);
        }
    }, [liveRole, liveHrPerms]);

    return useMemo(() => {
        const ready = status !== "loading";

        if (liveRole) {
            return {
                role: liveRole,
                hrPermissions: liveHrPerms,
                ready: true,
                isHydrating: false,
            };
        }

        if (status === "loading" && typeof window !== "undefined") {
            const cachedRole = normalizeRole(sessionStorage.getItem(ROLE_STORAGE_KEY) ?? undefined);
            const cachedHrPerms = sessionStorage.getItem(HR_PERMS_STORAGE_KEY);
            if (cachedRole) {
                return {
                    role: cachedRole,
                    hrPermissions: cachedHrPerms,
                    ready: false,
                    isHydrating: true,
                };
            }
        }

        return {
            role: ready ? (ROLES.EMPLOYEE as Role) : null,
            hrPermissions: null as string | null,
            ready,
            isHydrating: status === "loading",
        };
    }, [liveRole, liveHrPerms, status]);
}
