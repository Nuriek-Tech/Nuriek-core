import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, isNextResponse } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { Prisma } from "@prisma/client";

export async function POST(req: Request) {
    const user = await requireSession();
    if (isNextResponse(user)) return user;

    const path = new URL(req.url).pathname;
    const id = user.id;

    if (path.endsWith("check-in")) {
        const [config, dbUser] = await Promise.all([
            prisma.systemConfig.findUnique({ where: { id: "global" } }),
            prisma.user.findUnique({ where: { id }, select: { role: true } }),
        ]);

        const workStartHour = config?.workStartHour ?? 9;
        const workStartMin = config?.workStartMin ?? 0;
        const flexibleRoles = config?.flexibleRoles?.split(",") || ["INTERN"];

        const now = new Date();
        const clock = new Intl.DateTimeFormat("en-GB", { timeZone: process.env.WORK_TIME_ZONE || "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(now);
        const hour = Number(clock.find(part => part.type === "hour")?.value ?? 0);
        const minute = Number(clock.find(part => part.type === "minute")?.value ?? 0);

        let status = "PRESENT";
        if (!flexibleRoles.includes(dbUser?.role || "")) {
            if (hour * 60 + minute > workStartHour * 60 + workStartMin) status = "LATE";
        }

        let log;
        try {
            log = await prisma.$transaction(async tx => {
                const open = await tx.attendance.findFirst({ where: { userId: id, checkOut: null }, select: { id: true } });
                if (open) return null;
                return tx.attendance.create({ data: { userId: id, status, checkIn: now } });
            }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
                return NextResponse.json({ error: "Attendance was updated. Refresh and try again." }, { status: 409 });
            }
            throw error;
        }
        if (!log) return NextResponse.json({ error: "You have an open attendance session. Check out before checking in again." }, { status: 409 });

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

        const checkoutAt = new Date();
        if (checkoutAt.getTime() - activeLog.checkIn.getTime() > 24 * 60 * 60 * 1000) {
            return NextResponse.json({ error: "This session is more than 24 hours old. Ask HR to correct its check-out time." }, { status: 409 });
        }

        const log = await prisma.attendance.update({
            where: { id: activeLog.id },
            data: { checkOut: checkoutAt, breakEnd: activeLog.breakStart && !activeLog.breakEnd ? checkoutAt : undefined },
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

        if (activeLog.breakStart) {
            return NextResponse.json({ error: activeLog.breakEnd ? "Only one break can be recorded per attendance session" : "Break already in progress" }, { status: 400 });
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
