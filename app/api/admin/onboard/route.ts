import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ROLES } from "@/lib/constants";
import { sendOnboardingEmail } from "@/lib/mail";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);

    const currentUserRole = (session?.user as any).role;

    // Only FOUNDER and HR_ADMIN can onboard
    if (
        !session?.user ||
        ![(ROLES as any).FOUNDER, (ROLES as any).HR_ADMIN].includes(currentUserRole)
    ) {
        return new NextResponse("Unauthorized", { status: 403 });
    }

    try {
        const body = await req.json();
        const { name, email, role, department, position } = body;

        // Restriction: HR_ADMIN cannot onboard FOUNDER or HR_ADMIN
        if (currentUserRole === (ROLES as any).HR_ADMIN) {
            if ([(ROLES as any).FOUNDER, (ROLES as any).HR_ADMIN].includes(role)) {
                return new NextResponse("HR Admins cannot create other Admin roles.", { status: 403 });
            }
        }

        if (!name || !email || !role) {
            return new NextResponse("Missing required fields", { status: 400 });
        }

        // Check if user already exists
        const existingUser = await prisma.user.findFirst({
            where: { email: email }
        });

        if (existingUser) {
            return new NextResponse("User with this email already exists", { status: 400 });
        }

        // Create user and profile in a transaction
        const hashedPassword = await bcrypt.hash("password123", 12);
        const result = await prisma.$transaction(async (tx) => {
            const user = await tx.user.create({
                data: {
                    name,
                    email,
                    role,
                    onboardingStatus: "IN_PROGRESS",
                    password: hashedPassword, // ✅ Securely hashed
                    profile: {
                        create: {
                            department,
                            position,
                            joinDate: new Date(),
                        }
                    }
                }
            });

            return user;
        });

        // Send onboarding email to the official email
        await sendOnboardingEmail({ name, email });

        return NextResponse.json({
            message: "Employee onboarded successfully",
            user: {
                id: result.id,
                name: result.name,
                email: result.email
            }
        });

    } catch (error) {
        console.error("Onboarding error:", error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}
