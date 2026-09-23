import "@/styles/directory.css";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/lib/rbac";
import { isAdminRole, isSuperAdminRole, isDirectoryHiddenRole, type Role } from "@/lib/constants";
import { isLeaveExemptRole } from "@/lib/leave-approval";
import { getLeaveBalance } from "@/lib/leave";
import ClientProfileWrapper from "./client-profile";

type AttendanceEntry = { status: string };
type LeaveEntry = { status: string };

export default async function ProfilePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const session = await getSessionUser();
    if (!session) redirect("/login");
    const viewerRole = session.role;
    const isHrOrAdmin = isAdminRole(viewerRole);

    const user = await prisma.user.findUnique({
        where: { id },
        select: {
            id: true,
            name: true,
            email: true,
            role: true,
            reportsToId: true,
            reportsTo: { select: { id: true, name: true, email: true, role: true } },
            profile: { select: { department: true, joinDate: true } },
            attendance: isHrOrAdmin ? { select: { status: true } } : false,
            leaves: isHrOrAdmin ? { select: { status: true } } : false,
            badges: { select: { id: true, name: true, icon: true } },
            signatures: {
                select: { id: true, signedAt: true, document: { select: { title: true } } }
            },
            reviews: {
                select: { id: true, rating: true, feedback: true, createdAt: true, reviewer: { select: { name: true } } },
                orderBy: { createdAt: 'desc' }
            }
        }
    });

    if (!user || (!isHrOrAdmin && isDirectoryHiddenRole(user.role))) {
        return notFound();
    }

    const attendance: AttendanceEntry[] = isHrOrAdmin && "attendance" in user ? user.attendance : [];
    const leaves: LeaveEntry[] = isHrOrAdmin && "leaves" in user ? user.leaves : [];

    const totalAttendance = attendance.length;
    const lateArrivals = attendance.filter((a) => a.status === "LATE").length;
    const attendanceRate = totalAttendance > 0 ? Math.round(((totalAttendance - lateArrivals) / totalAttendance) * 100) : 100;
    const approvedLeaves = leaves.filter((l) => l.status === "APPROVED").length;
    const safeUser = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        reportsToId: user.reportsToId,
        reportsTo: user.reportsTo,
        profile: user.profile,
        badges: user.badges,
        signatures: user.signatures,
        reviews: user.reviews,
    };

    const leaveBalance =
        isSuperAdminRole(viewerRole as Role) &&
        !isLeaveExemptRole(user.role as Role)
            ? await getLeaveBalance(user.id, user.role as Role)
            : null;

    return (
        <ClientProfileWrapper
            user={safeUser}
            viewerRole={viewerRole}
            isHrOrAdmin={isHrOrAdmin}
            analytics={{ attendanceRate, lateArrivals, approvedLeaves }}
            leaveBalance={leaveBalance}
        />
    );
}
