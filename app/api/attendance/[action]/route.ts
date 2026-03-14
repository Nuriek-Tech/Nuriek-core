import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    const id = (session?.user as { id: string })?.id;

    if (!id) return new NextResponse("Unauthorized", { status: 401 });

    const path = new URL(req.url).pathname;

    if (path.endsWith("check-in")) {
        // Fetch system config and user role
        const [config, user] = await Promise.all([
            prisma.systemConfig.findUnique({ where: { id: "global" } }),
            prisma.user.findUnique({ where: { id }, select: { role: true } })
        ]);

        const workStartHour = config?.workStartHour ?? 9;
        const workStartMin = config?.workStartMin ?? 0;
        const flexibleRoles = config?.flexibleRoles?.split(",") || ["INTERN"];

        const now = new Date();
        const startOfToday = new Date();
        startOfToday.setHours(workStartHour, workStartMin, 0, 0);

        let status = "PRESENT";
        if (!flexibleRoles.includes(user?.role || "")) {
            if (now > startOfToday) {
                status = "LATE";
            }
        }

        const log = await prisma.attendance.create({
            data: {
                userId: id,
                status: status,
                checkIn: now,
            }
        });
        return NextResponse.json(log);
    }

    if (path.endsWith("check-out")) {
        const activeLog = await prisma.attendance.findFirst({
            where: { userId: id, checkOut: null },
            orderBy: { checkIn: 'desc' }
        });

        if (activeLog) {
            const log = await prisma.attendance.update({
                where: { id: activeLog.id },
                data: { checkOut: new Date() }
            });
            return NextResponse.json(log);
        }
        return new NextResponse("No active log", { status: 404 });
    }

    return new NextResponse("Not Found", { status: 404 });
}
