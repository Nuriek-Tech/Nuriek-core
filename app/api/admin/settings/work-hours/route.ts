import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireHrPermission, isNextResponse } from "@/lib/rbac";

export async function GET() {
    const user = await requireHrPermission("admin_settings");
    if (isNextResponse(user)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        let config = await prisma.systemConfig.findUnique({ where: { id: "global" } });

        if (!config) {
            config = await prisma.systemConfig.create({
                data: {
                    id: "global",
                    workStartHour: 9,
                    workStartMin: 0,
                    workEndHour: 18,
                    workEndMin: 0,
                    flexibleRoles: "INTERN"
                }
            });
        }

        return NextResponse.json(config);
    } catch (error) {
        console.error("Failed to fetch work hours config:", error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}

export async function POST(req: Request) {
    const user = await requireHrPermission("admin_settings");
    if (isNextResponse(user)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await req.json();
        const {
            workStartHour,
            workStartMin,
            workEndHour,
            workEndMin,
            flexibleRoles,
            officeName,
            lateGraceMinutes,
        } = body;

        const config = await prisma.systemConfig.upsert({
            where: { id: "global" },
            update: {
                workStartHour,
                workStartMin,
                workEndHour,
                workEndMin,
                flexibleRoles,
                officeName,
                ...(lateGraceMinutes !== undefined && { lateGraceMinutes }),
            },
            create: {
                id: "global",
                workStartHour,
                workStartMin,
                workEndHour,
                workEndMin,
                flexibleRoles,
                officeName: officeName || "Bangalore (HQ)",
                lateGraceMinutes: lateGraceMinutes ?? 15,
            },
        });

        return NextResponse.json(config);
    } catch (error) {
        console.error("Failed to update work hours config:", error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}
