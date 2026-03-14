import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ROLES } from "@/lib/constants";

export async function GET() {
    try {
        const tasks = await prisma.orgTask.findMany({
            orderBy: { createdAt: "desc" }
        });
        return NextResponse.json(tasks);
    } catch (error) {
        return new NextResponse("Internal Error", { status: 500 });
    }
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role;
    
    if (userRole !== ROLES.HR_ADMIN && userRole !== ROLES.FOUNDER) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    try {
        const body = await req.json();
        const task = await prisma.orgTask.create({
            data: {
                title: body.title,
                description: body.description,
                publishedBy: (session?.user as any)?.name || "Admin"
            }
        });
        return NextResponse.json(task);
    } catch (error) {
        return new NextResponse("Internal Error", { status: 500 });
    }
}
