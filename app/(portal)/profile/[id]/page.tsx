import "@/styles/directory.css";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isAdminRole, isSuperAdminRole, type Role } from "@/lib/constants";
import { getLeaveBalance } from "@/lib/leave";
import ClientProfileWrapper from "./client-profile";

type AttendanceEntry = { status: string };
type LeaveEntry = { status: string };

export default async function ProfilePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    const viewerRole = session?.user?.role;
    const isHrOrAdmin = isAdminRole(viewerRole);

    const user = await prisma.user.findUnique({
        where: { id },
        include: {
            reportsTo: { select: { id: true, name: true, email: true, role: true } },
            profile: true,
            attendance: isHrOrAdmin ? true : false,
            leaves: isHrOrAdmin ? true : false,
            badges: true,
            signatures: {
                include: { document: true }
            },
            reviews: {
                include: { reviewer: { select: { name: true } } },
                orderBy: { createdAt: 'desc' }
            }
        }
    });

    if (!user) {
        return notFound();
    }

    const attendance: AttendanceEntry[] = isHrOrAdmin && "attendance" in user ? user.attendance : [];
    const leaves: LeaveEntry[] = isHrOrAdmin && "leaves" in user ? user.leaves : [];

    const totalAttendance = attendance.length;
    const lateArrivals = attendance.filter((a) => a.status === "LATE").length;
    const attendanceRate = totalAttendance > 0 ? Math.round(((totalAttendance - lateArrivals) / totalAttendance) * 100) : 100;
    const approvedLeaves = leaves.filter((l) => l.status === "APPROVED").length;

    const leaveBalance =
        isSuperAdminRole(viewerRole as Role)
            ? await getLeaveBalance(user.id, user.role as Role)
            : null;

    return (
        <ClientProfileWrapper
            user={user}
            viewerRole={viewerRole}
            isHrOrAdmin={isHrOrAdmin}
            analytics={{ attendanceRate, lateArrivals, approvedLeaves }}
            leaveBalance={leaveBalance}
        />
    );
}
