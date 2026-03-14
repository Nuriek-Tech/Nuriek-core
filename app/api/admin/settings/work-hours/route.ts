import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ROLES } from "@/lib/constants";

export async function GET() {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as { role: string })?.role;

    if (!([ROLES.FOUNDER, ROLES.HR_ADMIN] as string[]).includes(userRole)) {
        return new NextResponse("Unauthorized", { status: 401 });
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
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as { role: string })?.role;

    if (!([ROLES.FOUNDER, ROLES.HR_ADMIN] as string[]).includes(userRole)) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    try {
        const body = await req.json();
        const { workStartHour, workStartMin, workEndHour, workEndMin, flexibleRoles } = body;

        const config = await prisma.systemConfig.upsert({
            where: { id: "global" },
            update: {
                workStartHour,
                workStartMin,
                workEndHour,
                workEndMin,
                flexibleRoles
            },
            create: {
                id: "global",
                workStartHour,
                workStartMin,
                workEndHour,
                workEndMin,
                flexibleRoles
            }
        });

        return NextResponse.json(config);
    } catch (error) {
        console.error("Failed to update work hours config:", error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}
