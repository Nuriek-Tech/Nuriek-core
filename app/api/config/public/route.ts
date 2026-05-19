import { NextResponse } from "next/server";
import { findSystemConfigSafe } from "@/lib/system-config-safe";

export async function GET() {
    try {
        const config = await findSystemConfigSafe();

        return NextResponse.json({
            officeName:
                config?.officeName ||
                process.env.NEXT_PUBLIC_OFFICE_NAME ||
                "Bangalore (HQ)",
        });
    } catch (error) {
        console.error("config/public error:", error);
        return NextResponse.json({
            officeName: process.env.NEXT_PUBLIC_OFFICE_NAME || "Bangalore (HQ)",
        });
    }
}
