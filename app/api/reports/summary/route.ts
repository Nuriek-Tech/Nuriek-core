import { NextResponse } from "next/server";
import { REPORT_ROLES } from "@/lib/constants";
import { requireRoles, isNextResponse } from "@/lib/rbac";
import { computeOrgDashboardSummary } from "@/lib/dashboard-metrics";

export async function GET() {
    const user = await requireRoles(REPORT_ROLES);
    if (isNextResponse(user)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const summary = await computeOrgDashboardSummary();
        return NextResponse.json(summary);
    } catch (error) {
        console.error("Reports Summary API Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
