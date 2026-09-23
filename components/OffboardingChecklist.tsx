"use client";

import { useEffect, useState } from "react";
import { OFFBOARDING_TASKS } from "@/lib/offboarding";

type TaskState = Record<string, { done: boolean; at: string; by: string | null }>;
const stamp = new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" });

export default function OffboardingChecklist({ userId }: { userId: string }) {
    const [tasks, setTasks] = useState<TaskState>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState<string | null>(null);
    const [error, setError] = useState("");
    useEffect(() => {
        fetch(`/api/admin/users/${userId}/offboarding`).then(response => {
            if (!response.ok) throw new Error("Could not load exit checklist");
            return response.json();
        }).then(data => setTasks(data.tasks || {})).catch(err => setError(err.message)).finally(() => setLoading(false));
    }, [userId]);

    async function toggle(taskId: string) {
        setSaving(taskId);
        setError("");
        try {
            const response = await fetch(`/api/admin/users/${userId}/offboarding`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ taskId, done: !tasks[taskId]?.done }) });
            if (!response.ok) throw new Error("Could not save checklist item");
            const updated = await response.json();
            setTasks(current => ({ ...current, [taskId]: updated }));
        } catch (err) { setError(err instanceof Error ? err.message : "Could not save"); }
        finally { setSaving(null); }
    }
    const completed = OFFBOARDING_TASKS.filter(task => tasks[task.id]?.done).length;
    return <div className="exitChecklist">
        <div className="activityHeading"><div><p className="peopleEyebrow">Exit workflow</p><h2>Offboarding checklist</h2><p>Portal access is revoked. Track the remaining steps here.</p></div><span className="activityCount">{completed}/{OFFBOARDING_TASKS.length} complete</span></div>
        {loading ? <p className="activityState">Loading checklist…</p> : <div className="exitTasks">{OFFBOARDING_TASKS.map(task => <label key={task.id} className="exitTask"><input type="checkbox" checked={Boolean(tasks[task.id]?.done)} disabled={saving === task.id} onChange={() => toggle(task.id)} /><span><strong>{task.title}</strong><small>{task.description}</small>{tasks[task.id]?.done && <time dateTime={tasks[task.id].at}>Completed {stamp.format(new Date(tasks[task.id].at))} IST{tasks[task.id].by ? ` by ${tasks[task.id].by}` : ""}</time>}</span></label>)}</div>}
        {error && <p className="obError" role="alert">{error}</p>}
    </div>;
}
