import { NextResponse } from "next/server";
import { requireSession, isNextResponse } from "@/lib/rbac";
import { computeUserMonthlyStats } from "@/lib/dashboard-metrics";

export async function GET() {
    const user = await requireSession();
    if (isNextResponse(user)) return user;

    try {
        const stats = await computeUserMonthlyStats(user.id);
        return NextResponse.json(stats);
    } catch (error) {
        console.error("Stats summary error:", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}
