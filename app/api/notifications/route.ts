import { NextResponse } from "next/server";
import { requireSession, isNextResponse } from "@/lib/rbac";
import { buildNotificationsForUser } from "@/lib/notifications";

export async function GET() {
    const user = await requireSession();
    if (isNextResponse(user)) return user;

    try {
        const notifications = await buildNotificationsForUser(user);
        return NextResponse.json({
            notifications,
            unreadCount: notifications.length,
        });
    } catch (error) {
        console.error("Notifications API error:", error);
        return NextResponse.json(
            { error: "Failed to load notifications" },
            { status: 500 }
        );
    }
}
