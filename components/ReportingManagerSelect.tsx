"use client";

import { useEffect, useState } from "react";

type ManagerOption = {
    id: string;
    label: string;
    name: string | null;
};

type Props = {
    value: string;
    onChange: (managerId: string) => void;
    disabled?: boolean;
    className?: string;
    id?: string;
    excludeUserId?: string;
};

export default function ReportingManagerSelect({
    value,
    onChange,
    disabled,
    className = "admInput",
    id,
    excludeUserId,
}: Props) {
    const [managers, setManagers] = useState<ManagerOption[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        fetch("/api/users/managers")
            .then((r) => (r.ok ? r.json() : { managers: [] }))
            .then((data) => {
                if (!cancelled) {
                    setManagers(Array.isArray(data.managers) ? data.managers : []);
                }
            })
            .catch(() => {
                if (!cancelled) setManagers([]);
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, []);

    const options = excludeUserId
        ? managers.filter((m) => m.id !== excludeUserId)
        : managers;

    return (
        <select
            id={id}
            className={className}
            value={value}
            disabled={disabled || loading}
            onChange={(e) => onChange(e.target.value)}
        >
            <option value="">{loading ? "Loading managers…" : "— Not assigned —"}</option>
            {options.map((m) => (
                <option key={m.id} value={m.id}>
                    {m.label}
                </option>
            ))}
        </select>
    );
}
