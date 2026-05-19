/**
 * Ensures admin@nuriek.com has Super Admin role and can use admin features.
 * Run: npx tsx scripts/fix_admin_roles.ts
 */
import { prisma } from "../lib/prisma";
import { ROLES } from "../lib/constants";

async function main() {
    const updated = await prisma.user.updateMany({
        where: { email: "admin@nuriek.com" },
        data: {
            role: ROLES.FOUNDER,
            mustChangePassword: false,
        },
    });

    console.log(`Updated ${updated.count} admin user(s) to Super Admin.`);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
