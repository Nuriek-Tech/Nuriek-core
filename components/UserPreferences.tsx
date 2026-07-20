"use client";

import { useEffect, useState } from "react";
import { Sliders } from "lucide-react";

const PREFS_KEY = "nuriek-user-prefs";

type Prefs = {
    compactTables: boolean;
    emailDigest: boolean;
};

const DEFAULT_PREFS: Prefs = {
    compactTables: false,
    emailDigest: true,
};

function loadPrefs(): Prefs {
    if (typeof window === "undefined") return DEFAULT_PREFS;
    try {
        const raw = localStorage.getItem(PREFS_KEY);
        return raw ? { ...DEFAULT_PREFS, ...JSON.parse(raw) } : DEFAULT_PREFS;
    } catch {
        return DEFAULT_PREFS;
    }
}

function Toggle({
    on,
    onChange,
    label,
    hint,
    compact,
}: {
    on: boolean;
    onChange: (v: boolean) => void;
    label: string;
    hint?: string;
    compact?: boolean;
}) {
    return (
        <div className={`setToggleRow${compact ? " setToggleRow--compact" : ""}`}>
            <div>
                <div className="setToggleLabel">{label}</div>
                {hint && <p className="setToggleHint">{hint}</p>}
            </div>
            <button
                type="button"
                role="switch"
                aria-checked={on}
                className={`setToggle ${on ? "setToggle--on" : ""}`}
                onClick={() => onChange(!on)}
            >
                <span className="setToggleKnob" />
            </button>
        </div>
    );
}

export default function UserPreferences() {
    const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);

    useEffect(() => {
        const p = loadPrefs();
        Promise.resolve().then(() => setPrefs(p));
    }, []);

    const update = (patch: Partial<Prefs>) => {
        const next = { ...prefs, ...patch };
        setPrefs(next);
        localStorage.setItem(PREFS_KEY, JSON.stringify(next));
    };

    return (
        <section className="setPanel glass setPanel--compact">
            <div className="setPanelHeader">
                <span className="setPanelTitle">
                    <span className="setPanelIcon">
                        <Sliders size={18} />
                    </span>
                    Preferences
                </span>
            </div>

            <div className="setPrefsToggles">
                <Toggle
                    label="Compact tables"
                    hint="Denser rows on reports (this browser)."
                    on={prefs.compactTables}
                    onChange={(v) => update({ compactTables: v })}
                    compact
                />
                <Toggle
                    label="HR reminders"
                    hint="In-app reminders for pending HR items."
                    on={prefs.emailDigest}
                    onChange={(v) => update({ emailDigest: v })}
                    compact
                />
            </div>
        </section>
    );
}
