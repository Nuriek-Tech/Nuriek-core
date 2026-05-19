import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRoles, isNextResponse } from "@/lib/rbac";
import { ADMIN_ROLES } from "@/lib/constants";

export async function GET() {
    try {
        const tasks = await prisma.orgTask.findMany({
            orderBy: { createdAt: "desc" }
        });
        return NextResponse.json(tasks);
    } catch {
        return new NextResponse("Internal Error", { status: 500 });
    }
}

export async function POST(req: Request) {
    const user = await requireRoles(ADMIN_ROLES);
    if (isNextResponse(user)) return user;

    try {
        const body = await req.json();
        const task = await prisma.orgTask.create({
            data: {
                title: body.title,
                description: body.description,
                publishedBy: user.name || "Admin"
            }
        });
        return NextResponse.json(task);
    } catch {
        return new NextResponse("Internal Error", { status: 500 });
    }
}
