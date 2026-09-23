"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, Loader2 } from "lucide-react";

type Event = { id: string; at: string; title: string; detail: string; category: string };
const stamp = new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata" });

export default function UserLifecycleTimeline({ userId }: { userId: string }) {
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [filter, setFilter] = useState("All");
    const [visible, setVisible] = useState(20);
    const [hasMore, setHasMore] = useState(false);

    useEffect(() => {
        const controller = new AbortController();
        fetch(`/api/users/${userId}/lifecycle`, { signal: controller.signal })
            .then(response => { if (!response.ok) throw new Error("Unable to load activity"); return response.json(); })
            .then(data => { setEvents(data.events || []); setHasMore(Boolean(data.hasMore)); })
            .catch(error => { if (error.name !== "AbortError") setError(true); })
            .finally(() => setLoading(false));
        return () => controller.abort();
    }, [userId]);

    const categories = useMemo(() => ["All", ...new Set(events.map(event => event.category))], [events]);
    const filtered = useMemo(() => events.filter(event => filter === "All" || event.category === filter), [events, filter]);
    return <div className="activityPanel">
        <div className="activityHeading"><div><p className="peopleEyebrow">Recorded history</p><h2>Employee activity</h2><p>Every entry includes the exact date and time in India Standard Time.</p></div><span className="activityCount">{events.length} events</span></div>
        {loading ? <div className="activityState"><Loader2 size={22} className="animate-spin" /> Loading activity…</div> :
        error ? <div className="activityState">Activity could not be loaded. Refresh the page to try again.</div> :
        events.length === 0 ? <div className="activityState"><Activity size={20} /> No activity recorded yet.</div> : <>
            <div className="activityFilters" role="group" aria-label="Filter activity">{categories.map(category => <button key={category} type="button" className={filter === category ? "active" : ""} onClick={() => { setFilter(category); setVisible(20); }}>{category}</button>)}</div>
            <ol className="activityList">{filtered.slice(0, visible).map(event => {
                const date = new Date(event.at);
                return <li key={event.id}><span className="activityDot" /><div className="activityEntry"><div><strong>{event.title}</strong><span className="activityCategory">{event.category}</span></div>{event.detail && <p>{event.detail}</p>}</div><time dateTime={event.at} title={date.toISOString()}>{stamp.format(date)} IST</time></li>;
            })}</ol>
            {filtered.length > visible && <button type="button" className="activityMore" onClick={() => setVisible(count => count + 20)}>Show more activity</button>}
            {hasMore && <p className="activityFootnote">Showing the 300 most recent recorded events.</p>}
        </>}
    </div>;
}
