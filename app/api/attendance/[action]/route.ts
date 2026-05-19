import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, isNextResponse } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";

export async function POST(req: Request) {
    const user = await requireSession();
    if (isNextResponse(user)) return user;

    const path = new URL(req.url).pathname;
    const id = user.id;

    if (path.endsWith("check-in")) {
        const openLog = await prisma.attendance.findFirst({
            where: { userId: id, checkOut: null },
            orderBy: { checkIn: "desc" },
        });

        if (openLog) {
            const today = new Date().toDateString();
            const openDay = new Date(openLog.checkIn).toDateString();
            if (openDay === today) {
                return NextResponse.json(
                    { error: "You are already checked in. Use Check out when you finish." },
                    { status: 400 }
                );
            }
            // Close a forgotten session from a previous day so today can start fresh
            await prisma.attendance.update({
                where: { id: openLog.id },
                data: { checkOut: new Date(openLog.checkIn.getTime() + 8 * 60 * 60 * 1000) },
            });
        }

        const [config, dbUser] = await Promise.all([
            prisma.systemConfig.findUnique({ where: { id: "global" } }),
            prisma.user.findUnique({ where: { id }, select: { role: true } }),
        ]);

        const workStartHour = config?.workStartHour ?? 9;
        const workStartMin = config?.workStartMin ?? 0;
        const flexibleRoles = config?.flexibleRoles?.split(",") || ["INTERN"];

        const now = new Date();
        const startOfToday = new Date();
        startOfToday.setHours(workStartHour, workStartMin, 0, 0);

        let status = "PRESENT";
        if (!flexibleRoles.includes(dbUser?.role || "")) {
            if (now > startOfToday) status = "LATE";
        }

        const log = await prisma.attendance.create({
            data: {
                userId: id,
                status,
                checkIn: now,
            },
        });

        await logAudit({
            actorId: id,
            actorEmail: user.email,
            action: "ATTENDANCE_CHECK_IN",
            entity: "Attendance",
            entityId: log.id,
        });

        return NextResponse.json(log);
    }

    if (path.endsWith("check-out")) {
        const activeLog = await prisma.attendance.findFirst({
            where: { userId: id, checkOut: null },
            orderBy: { checkIn: "desc" },
        });

        if (!activeLog) {
            return new NextResponse("No active log", { status: 404 });
        }

        const log = await prisma.attendance.update({
            where: { id: activeLog.id },
            data: { checkOut: new Date(), breakEnd: activeLog.breakStart && !activeLog.breakEnd ? new Date() : undefined },
        });

        await logAudit({
            actorId: id,
            actorEmail: user.email,
            action: "ATTENDANCE_CHECK_OUT",
            entity: "Attendance",
            entityId: log.id,
        });

        return NextResponse.json(log);
    }

    if (path.endsWith("break-start")) {
        const activeLog = await prisma.attendance.findFirst({
            where: { userId: id, checkOut: null },
            orderBy: { checkIn: "desc" },
        });

        if (!activeLog) {
            return new NextResponse("Check in before starting a break", { status: 400 });
        }

        if (activeLog.breakStart && !activeLog.breakEnd) {
            return new NextResponse("Break already in progress", { status: 400 });
        }

        const log = await prisma.attendance.update({
            where: { id: activeLog.id },
            data: { breakStart: new Date(), breakEnd: null },
        });

        await logAudit({
            actorId: id,
            actorEmail: user.email,
            action: "ATTENDANCE_BREAK",
            entity: "Attendance",
            entityId: log.id,
            metadata: { phase: "start" },
        });

        return NextResponse.json(log);
    }

    if (path.endsWith("break-end")) {
        const activeLog = await prisma.attendance.findFirst({
            where: { userId: id, checkOut: null },
            orderBy: { checkIn: "desc" },
        });

        if (!activeLog?.breakStart || activeLog.breakEnd) {
            return new NextResponse("No active break", { status: 400 });
        }

        const log = await prisma.attendance.update({
            where: { id: activeLog.id },
            data: { breakEnd: new Date() },
        });

        await logAudit({
            actorId: id,
            actorEmail: user.email,
            action: "ATTENDANCE_BREAK",
            entity: "Attendance",
            entityId: log.id,
            metadata: { phase: "end" },
        });

        return NextResponse.json(log);
    }

    return new NextResponse("Not Found", { status: 404 });
}
