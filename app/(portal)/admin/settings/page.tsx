import { redirect } from "next/navigation";

/** Legacy URL — Super Admin & HR settings live on /settings */
export default function AdminSettingsPage() {
    redirect("/settings#super-admin");
}
