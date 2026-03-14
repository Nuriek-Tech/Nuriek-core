
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
    const email = "admin@nuriek.com";
    const newPassword = "admin123";
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const user = await prisma.user.upsert({
        where: { email },
        update: { password: hashedPassword, role: "FOUNDER" },
        create: {
            email,
            name: "Super Admin",
            password: hashedPassword,
            role: "FOUNDER",
        },
    });

    console.log(`Updated password for ${user.email} to ${newPassword}`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
