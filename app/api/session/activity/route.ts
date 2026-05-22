import { NextResponse } from "next/server";
import { requireSession, isNextResponse } from "@/lib/rbac";
import { touchLoginSession, endActiveLoginSession } from "@/lib/session-tracking";

export async function POST(req: Request) {
    const user = await requireSession();
    if (isNextResponse(user)) return user;

    try {
        const body = await req.json().catch(() => ({}));
        const reason = body.reason === "inactivity" ? "inactivity" : "logout";

        if (reason === "inactivity") {
            await endActiveLoginSession(user.id, "inactivity");
        } else {
            await touchLoginSession(user.id);
        }

        return NextResponse.json({ ok: true });
    } catch {
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
