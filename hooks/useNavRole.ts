"use client";

import { useEffect, useMemo } from "react";
import { useSession } from "next-auth/react";
import { ROLES, type Role } from "@/lib/constants";
import { normalizeRole } from "@/lib/roles";

const ROLE_STORAGE_KEY = "nuriek.portal.role";

function readCachedRole(): Role | null {
    if (typeof window === "undefined") return null;
    try {
        return normalizeRole(sessionStorage.getItem(ROLE_STORAGE_KEY) ?? undefined);
    } catch {
        return null;
    }
}

/** Stable role for sidebar/nav — avoids flashing EMPLOYEE while session hydrates. */
export function useNavRole() {
    const { data: session, status } = useSession();

    const sessionRole = session?.user?.role;
    const cachedRole = useMemo(() => readCachedRole(), [sessionRole, status]);

    useEffect(() => {
        if (!sessionRole) return;
        try {
            sessionStorage.setItem(ROLE_STORAGE_KEY, sessionRole);
        } catch {
            /* ignore */
        }
    }, [sessionRole]);

    const role: Role =
        sessionRole ??
        (status === "loading" ? cachedRole : null) ??
        ROLES.EMPLOYEE;

    const isHydrating = status === "loading" && !sessionRole && Boolean(cachedRole);

    return {
        role,
        hrPermissions: session?.user?.hrPermissions ?? null,
        status,
        isHydrating,
        isReady: status !== "loading" || Boolean(sessionRole),
    };
}
