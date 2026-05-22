"use client";

import { useCallback, useEffect, useRef } from "react";
import { signOut, useSession } from "next-auth/react";
import { hasInactivityAutoLogout, SESSION_INACTIVITY_MS } from "@/lib/constants";
import type { Role } from "@/lib/constants";

const CHECK_INTERVAL_MS = 30_000;
const PING_INTERVAL_MS = 2 * 60_000;
const ACTIVITY_THROTTLE_MS = 15_000;

/** Signs out employees & HR after 15 minutes of inactivity. Super Admin is exempt. */
export default function InactivityGuard() {
    const { data: session, status } = useSession();
    const lastActivityRef = useRef(Date.now());
    const lastPingRef = useRef(0);
    const signingOutRef = useRef(false);

    const role = session?.user?.role as Role | undefined;
    const enabled = status === "authenticated" && role && hasInactivityAutoLogout(role);

    const recordActivity = useCallback(() => {
        lastActivityRef.current = Date.now();
    }, []);

    const pingServer = useCallback(async (reason?: "inactivity") => {
        try {
            await fetch("/api/session/activity", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ reason: reason ?? "activity" }),
                keepalive: reason === "inactivity",
            });
        } catch {
            /* ignore */
        }
    }, []);

    const handleInactivityLogout = useCallback(async () => {
        if (signingOutRef.current) return;
        signingOutRef.current = true;
        await pingServer("inactivity");
        await signOut({ callbackUrl: "/login?reason=inactivity" });
    }, [pingServer]);

    useEffect(() => {
        if (!enabled) return;

        recordActivity();

        const onActivity = () => {
            const now = Date.now();
            if (now - lastPingRef.current >= ACTIVITY_THROTTLE_MS) {
                lastPingRef.current = now;
                recordActivity();
                void pingServer();
            } else {
                recordActivity();
            }
        };

        const events: (keyof WindowEventMap)[] = [
            "mousedown",
            "keydown",
            "scroll",
            "touchstart",
            "click",
        ];
        for (const ev of events) {
            window.addEventListener(ev, onActivity, { passive: true });
        }

        const onVisibility = () => {
            if (document.visibilityState === "visible") {
                const idle = Date.now() - lastActivityRef.current;
                if (idle >= SESSION_INACTIVITY_MS) {
                    void handleInactivityLogout();
                }
            }
        };
        document.addEventListener("visibilitychange", onVisibility);

        const interval = window.setInterval(() => {
            const idle = Date.now() - lastActivityRef.current;
            if (idle >= SESSION_INACTIVITY_MS) {
                void handleInactivityLogout();
            }
        }, CHECK_INTERVAL_MS);

        const pingInterval = window.setInterval(() => {
            if (Date.now() - lastActivityRef.current < SESSION_INACTIVITY_MS) {
                void pingServer();
            }
        }, PING_INTERVAL_MS);

        return () => {
            for (const ev of events) {
                window.removeEventListener(ev, onActivity);
            }
            document.removeEventListener("visibilitychange", onVisibility);
            window.clearInterval(interval);
            window.clearInterval(pingInterval);
        };
    }, [enabled, recordActivity, pingServer, handleInactivityLogout]);

    return null;
}
