"use client";

import { useEffect, useState } from "react";

type Props = {
    className?: string;
    /** card = dashboard header; large = attendance panel */
    variant?: "card" | "large";
};

/** Live clock with fixed width so seconds ticking does not shift layout. */
export default function LiveClock({ className = "", variant = "card" }: Props) {
    const [now, setNow] = useState(() => new Date());

    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const hours = now.getHours();
    const minutes = now.getMinutes();
    const seconds = now.getSeconds();
    const period = hours >= 12 ? "PM" : "AM";
    const h12 = hours % 12 || 12;
    const mm = String(minutes).padStart(2, "0");
    const ss = String(seconds).padStart(2, "0");

    return (
        <time
            dateTime={now.toISOString()}
            className={`liveClock liveClock--${variant} ${className}`.trim()}
        >
            <span className="liveClock-hm">
                {h12}:{mm}
            </span>
            <span className="liveClock-sec">:{ss}</span>
            <span className="liveClock-period">{period}</span>
        </time>
    );
}
