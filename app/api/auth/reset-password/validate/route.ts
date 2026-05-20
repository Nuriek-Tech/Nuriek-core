import { NextResponse } from "next/server";
import { findValidResetToken } from "@/lib/password-reset";

export async function GET(req: Request) {
    const token = new URL(req.url).searchParams.get("token");
    if (!token) {
        return NextResponse.json({ valid: false });
    }

    const record = await findValidResetToken(token);
    return NextResponse.json({ valid: Boolean(record) });
}
