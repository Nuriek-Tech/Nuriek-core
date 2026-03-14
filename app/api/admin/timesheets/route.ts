import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
    const session = await getServerSession(authOptions);
    
    // Only FOUNDER and HR_ADMIN can access
    if (!session?.user || !["FOUNDER", "HR_ADMIN"].includes((session.user as any).role)) {
        return new NextResponse("Unauthorized", { status: 403 });
    }

    try {
        const timesheets = await prisma.timesheet.findMany({
            include: {
                user: {
                    select: {
                        name: true,
                        email: true,
                        image: true,
                    }
                }
            },
            orderBy: { createdAt: 'desc' },
            take: 100
        });

        return NextResponse.json(timesheets);
    } catch (error) {
        console.error("Admin timesheets fetch error:", error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}
