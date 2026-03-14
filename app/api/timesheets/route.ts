import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return new NextResponse("Unauthorized", { status: 401 });

    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
    });

    if (!user) return new NextResponse("User not found", { status: 404 });

    const timesheets = await prisma.timesheet.findMany({
        where: { userId: user.id },
        orderBy: { date: 'desc' },
        take: 30
    });

    return NextResponse.json(timesheets);
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return new NextResponse("Unauthorized", { status: 401 });

    try {
        const body = await req.json();
        const { tasks, hours, date } = body;

        if (!tasks) return new NextResponse("Tasks description is required", { status: 400 });

        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
        });

        if (!user) return new NextResponse("User not found", { status: 404 });

        const targetDate = date ? new Date(date) : new Date();
        const todayStr = targetDate.toDateString();

        // 7-hour validation
        const attendanceLogs = await prisma.attendance.findMany({
            where: { userId: user.id }
        });
        
        const todaysLogs = attendanceLogs.filter((log: any) => new Date(log.checkIn).toDateString() === todayStr);
        
        let totalLoggedMs = 0;
        for (const log of todaysLogs) {
            const end = log.checkOut ? new Date(log.checkOut) : new Date();
            const start = new Date(log.checkIn);
            totalLoggedMs += end.getTime() - start.getTime();
        }
        
        const totalLoggedHours = totalLoggedMs / (1000 * 60 * 60);

        if (totalLoggedHours < 7) {
            return new NextResponse(`Compliance Issue: You must have at least 7 hours logged before submitting a timesheet. Currently logged: ${totalLoggedHours.toFixed(1)} hours.`, { status: 400 });
        }

        const timesheet = await prisma.timesheet.create({
            data: {
                userId: user.id,
                tasks,
                hours: parseFloat(hours) || 8.0,
                date: targetDate,
                status: "SUBMITTED"
            }
        });

        // Send HR Notification
        try {
            const hrAdmins = await prisma.user.findMany({
                where: { role: "HR_ADMIN" }
            });
            const hrEmails = hrAdmins.map((hr: any) => hr.email).filter(Boolean) as string[];
            if (hrEmails.length > 0) {
                const { sendTimesheetApprovalEmail } = await import("@/lib/mail");
                await sendTimesheetApprovalEmail(user.name || user.email || "Employee", todayStr, hrEmails);
            }
        } catch (mailError) {
            console.error("Failed to send HR notification for timesheet:", mailError);
        }

        return NextResponse.json(timesheet);
    } catch (error) {
        console.error("Timesheet submission error:", error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}
