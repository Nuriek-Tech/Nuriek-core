import { prisma } from "./lib/prisma";
import { ROLES } from "./lib/constants";
import bcrypt from "bcryptjs";

async function main() {
    // 1. Seed Users
    const users = [
        {
            name: "Super Admin",
            email: "admin@nuriek.com",
            password: "Pass123",
            role: ROLES.FOUNDER,
        },
        {
            name: "HR Manager",
            email: "hr@nuriek.com",
            password: "password123",
            role: ROLES.HR_ADMIN,
        },
        {
            name: "John Employee",
            email: "john@nuriek.com",
            password: "password123",
            role: ROLES.EMPLOYEE,
        },
        {
            name: "Sarah Intern",
            email: "sarah@nuriek.com",
            password: "password123",
            role: ROLES.INTERN,
        },
    ];

    let johnId = "";
    let sarahId = "";
    let adminId = "";

    for (const userData of users) {
        const hashedPassword = await bcrypt.hash(userData.password, 12);
        const user = await prisma.user.upsert({
            where: { email: userData.email },
            update: {
                name: userData.name,
                password: hashedPassword, // ✅ Always store hashed
            },
            create: {
                ...userData,
                password: hashedPassword,
                profile: {
                    create: {
                        position: userData.role === ROLES.FOUNDER ? "Founder & CEO" : "Team Member",
                        department: userData.role === ROLES.HR_ADMIN ? "HR" : "Core Team",
                    },
                },
            },
        });
        if (user.email === "john@nuriek.com") johnId = user.id;
        if (user.email === "sarah@nuriek.com") sarahId = user.id;
        if (user.email === "admin@nuriek.com") adminId = user.id;
        console.log(`Upserted user: ${user.email}`);
    }

    // 2. Seed Documents
    const documents = [
        {
            title: "Employee Handbook 2026",
            description: "Complete guide to Nuriek culture, policies, and benefits. Updated for 2026.",
            url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
            type: "POLICY",
            category: "Resources",
            allowedRoles: "ALL",
            size: 5242880, // 5MB
        },
        {
            title: "Remote Work Policy",
            description: "Guidelines and requirements for working from home.",
            url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
            type: "POLICY",
            category: "Resources",
            allowedRoles: "ALL",
            size: 1048576, // 1MB
        },
        {
            title: "Nuriek NDA v2",
            description: "Standard non-disclosure agreement for all employees. Covers confidentiality, IP assignment, and non-solicitation.",
            url: "/nuriek-nda-v2.html",
            type: "LEGAL",
            category: "Resources",
            allowedRoles: "ALL",
            size: 2097152, // 2MB
        },
        {
            title: "Nuriek Data Privacy Policy",
            description: "How we handle customer and employee data.",
            url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
            type: "POLICY",
            category: "Resources",
            allowedRoles: "ALL",
            size: 1572864, // 1.5MB
        },
    ];

    for (const doc of documents) {
        await (prisma as any).document.upsert({
            where: { id: `seed-${doc.title.replace(/\s+/g, '-').toLowerCase()}` },
            update: doc,
            create: {
                id: `seed-${doc.title.replace(/\s+/g, '-').toLowerCase()}`,
                ...doc,
            },
        });
    }
    console.log("Seeded documents");

    // 2.5 Seed Holidays
    const holidays = [
        { name: "Republic Day", date: new Date("2026-01-26"), type: "PUBLIC" },
        { name: "Holi", date: new Date("2026-03-14"), type: "PUBLIC" },
        { name: "Independence Day", date: new Date("2026-08-15"), type: "PUBLIC" },
        { name: "Gandhi Jayanti", date: new Date("2026-10-02"), type: "PUBLIC" },
        { name: "Diwali", date: new Date("2026-11-08"), type: "PUBLIC" },
    ];
    for (const h of holidays) {
        await (prisma as any).holiday.create({ data: h });
    }
    console.log("Seeded holidays");

    // 3. Seed Leaves & Attendance
    const seedDataForUser = async (userId: string, name: string) => {
        if (!userId) return;

        // Leaves
        await prisma.leave.createMany({
            data: [
                {
                    userId: userId,
                    type: "CASUAL",
                    startDate: new Date("2026-01-10"),
                    endDate: new Date("2026-01-12"),
                    status: "APPROVED",
                    reason: `Family wedding (${name})`,
                }
            ],
        });

        // Intern Performance for Sarah
        if (name === "Sarah") {
            await (prisma as any).internPerformance.upsert({
                where: { userId: userId },
                create: {
                    userId: userId,
                    learningProgress: 75,
                    taskCompletion: 88,
                    score: 92,
                    duration: "Month 2 of 6",
                    conversionRisk: "LOW",
                    onboardingData: JSON.stringify([
                        { task: "Company Orientation", done: true },
                        { task: "Development Setup", done: true },
                        { task: "Culture Quiz", done: true },
                        { task: "NDA Signing", done: true },
                        { task: "First Project Assigned", done: true },
                        { task: "Mid-term Review", done: false },
                    ])
                },
                update: {} // No update needed for seed data stability
            });
        }

        // Attendance
        await prisma.attendance.createMany({
            data: [
                {
                    userId: userId,
                    checkIn: new Date("2026-01-20T09:00:00"),
                    checkOut: new Date("2026-01-20T17:00:00"),
                    status: "ON_TIME",
                },
                {
                    userId: userId,
                    checkIn: new Date("2026-01-21T09:15:00"),
                    checkOut: new Date("2026-01-21T17:30:00"),
                    status: "LATE",
                },
                {
                    userId: userId,
                    checkIn: new Date("2026-01-22T08:55:00"),
                    checkOut: null,
                    status: "ON_TIME",
                }
            ]
        });
        console.log(`Seeded data for ${name}`);
    }

    await seedDataForUser(johnId, "John");
    await seedDataForUser(sarahId, "Sarah");
    await seedDataForUser(adminId, "Admin");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
