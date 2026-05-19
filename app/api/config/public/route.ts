import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
    const config = await prisma.systemConfig.findUnique({ where: { id: "global" } });

    return NextResponse.json({
        officeName:
            config?.officeName ||
            process.env.NEXT_PUBLIC_OFFICE_NAME ||
            "Bangalore (HQ)",
    });
}
