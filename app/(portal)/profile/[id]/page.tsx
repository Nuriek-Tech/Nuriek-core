import {
    User,
    Mail,
    Shield,
    FileText,
    MessageSquare,
    Award,
    Zap,
    TrendingUp
} from "lucide-react";
import "@/styles/directory.css";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ROLES } from "@/lib/constants";

export default async function ProfilePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    const viewerRole = (session?.user as any)?.role;
    const isHrOrAdmin = [ROLES.HR_ADMIN, ROLES.FOUNDER].includes(viewerRole);

    const user = await prisma.user.findUnique({
        where: { id },
        include: {
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

    // Analytics Calculation
    const attendance = (user as any).attendance || [];
    const leaves = (user as any).leaves || [];

    const totalAttendance = attendance.length;
    const lateArrivals = attendance.filter((a: any) => a.status === 'LATE').length;
    const attendanceRate = totalAttendance > 0 ? Math.round(((totalAttendance - lateArrivals) / totalAttendance) * 100) : 100;
    const approvedLeaves = leaves.filter((l: any) => l.status === 'APPROVED').length;

    return (
        <ClientProfileWrapper
            user={user}
            viewerRole={viewerRole}
            isHrOrAdmin={isHrOrAdmin}
            analytics={{ attendanceRate, lateArrivals, approvedLeaves }}
        />
    );
}

// Client Component Wrapper
import ClientProfileWrapper from "./client-profile";
