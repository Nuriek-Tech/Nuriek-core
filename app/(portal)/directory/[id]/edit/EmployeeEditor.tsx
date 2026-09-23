"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save } from "lucide-react";
import "@/styles/people-hub.css";
import "./employee-editor.css";

type Employee = {
    id: string;
    name: string | null;
    email: string | null;
    role: string;
    reportsToId: string | null;
    profile: { position: string | null; department: string | null; phoneNumber: string | null; address: string | null; joinDate: string } | null;
};
type Manager = { id: string; name: string | null; email: string | null; role: string };

export default function EmployeeEditor({ employee, managers }: { employee: Employee; managers: Manager[] }) {
    const router = useRouter();
    const [form, setForm] = useState({
        name: employee.name || "",
        position: employee.profile?.position || "",
        department: employee.profile?.department || "",
        phoneNumber: employee.profile?.phoneNumber || "",
        address: employee.profile?.address || "",
        joinDate: employee.profile?.joinDate || "",
        reportsToId: employee.reportsToId || "",
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const submit = async (event: FormEvent) => {
        event.preventDefault();
        setSaving(true);
        setError("");
        try {
            const response = await fetch(`/api/admin/employees/${employee.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...form, reportsToId: form.reportsToId || null }),
            });
            const result = await response.json();
            if (!response.ok) {
                setError(result.error || "Could not save employee record");
                return;
            }
            router.push(`/profile/${employee.id}`);
            router.refresh();
        } catch {
            setError("Could not save employee record. Try again.");
        } finally {
            setSaving(false);
        }
    };

    return <div className="hubPage employeeEditor">
        <header className="hubHero">
            <div className="hubHeroMain">
                <Link href={`/profile/${employee.id}`} className="employeeEditorBack"><ArrowLeft size={16} /> Back to profile</Link>
                <p className="hubEyebrow">People / Employee record</p>
                <h1>Edit {employee.name || "employee"}</h1>
                <p className="hubSubtitle">Maintain the employee&apos;s core work details and reporting line.</p>
            </div>
        </header>
        <form onSubmit={submit} className="employeeEditorForm glass">
            <div className="employeeEditorInfo"><span>Work email</span><strong>{employee.email || "—"}</strong></div>
            <div className="employeeEditorInfo"><span>Role</span><strong>{employee.role.replaceAll("_", " ")}</strong></div>
            <div className="employeeEditorGrid">
                <label>Full name<input required maxLength={120} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></label>
                <label>Position<input maxLength={120} value={form.position} onChange={e => setForm({ ...form, position: e.target.value })} /></label>
                <label>Department<input maxLength={120} value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} /></label>
                <label>Join date<input required type="date" value={form.joinDate} onChange={e => setForm({ ...form, joinDate: e.target.value })} /></label>
                <label>Phone number<input type="tel" maxLength={40} value={form.phoneNumber} onChange={e => setForm({ ...form, phoneNumber: e.target.value })} /></label>
                <label>Reporting manager<select value={form.reportsToId} onChange={e => setForm({ ...form, reportsToId: e.target.value })}><option value="">No reporting manager</option>{managers.map(m => <option value={m.id} key={m.id}>{m.name || m.email} · {m.role.replaceAll("_", " ")}</option>)}</select></label>
            </div>
            <label>Address<textarea maxLength={500} rows={3} value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} /></label>
            {error && <p className="employeeEditorError" role="alert">{error}</p>}
            <div className="employeeEditorActions"><Link href={`/profile/${employee.id}`}>Cancel</Link><button className="hubBtnPrimary" type="submit" disabled={saving}><Save size={16} /> {saving ? "Saving…" : "Save employee"}</button></div>
        </form>
    </div>;
}
