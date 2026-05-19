"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { ROLES } from "@/lib/constants";
import InternWelcomeModal from "@/components/InternWelcomeModal";

export default function InternOnboardingGate() {
    const { data: session, status } = useSession();
    const [showWelcome, setShowWelcome] = useState(false);
    const [userName, setUserName] = useState<string | null>(null);
    const [checked, setChecked] = useState(false);

    useEffect(() => {
        if (status !== "authenticated" || session?.user?.role !== ROLES.INTERN) {
            setChecked(true);
            return;
        }

        let cancelled = false;

        fetch("/api/onboarding/complete", { cache: "no-store" })
            .then((res) => (res.ok ? res.json() : null))
            .then((data) => {
                if (cancelled || !data) return;
                if (data.showWelcome) {
                    setShowWelcome(true);
                    setUserName(data.name ?? session.user?.name ?? null);
                }
            })
            .finally(() => {
                if (!cancelled) setChecked(true);
            });

        return () => {
            cancelled = true;
        };
    }, [status, session]);

    if (!checked || !showWelcome) return null;

    return (
        <InternWelcomeModal
            userName={userName}
            onComplete={() => setShowWelcome(false)}
        />
    );
}
