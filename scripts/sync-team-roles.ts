/**
 * Align team roles with HR records (interns + Rekha as HR Admin).
 * Run: npx tsx scripts/sync-team-roles.ts
 */
import { prisma } from "../lib/prisma";
import { ROLES } from "../lib/constants";
import { HR_ADMIN_DEFAULT_PERMISSIONS } from "../lib/hr-permissions";

type Matcher = {
    label: string;
    emails?: string[];
    nameIncludes?: string[];
    emailIncludes?: string[];
};

const INTERN_TARGETS: Matcher[] = [
    {
        label: "Avnish Agrawal",
        nameIncludes: ["avnish"],
        emailIncludes: ["avnish"],
    },
    {
        label: "Srinivas Talar",
        nameIncludes: ["srinivas", "talar"],
        emailIncludes: ["srinivas", "talar"],
    },
    {
        label: "Pallab",
        nameIncludes: ["pallab"],
        emailIncludes: ["pallab"],
    },
    {
        label: "Kavyadarshini",
        nameIncludes: ["kavya", "kavyadarshini"],
        emailIncludes: ["kavya", "kavyadarshini"],
    },
];

const REKHA_TARGETS: Matcher[] = [
    {
        label: "Rekha (HR Admin)",
        emails: ["rekha@nuriek.com"],
        nameIncludes: ["rekha"],
        emailIncludes: ["rekha"],
    },
];

function matches(user: { name: string | null; email: string | null }, m: Matcher): boolean {
    const name = (user.name ?? "").toLowerCase();
    const email = (user.email ?? "").toLowerCase();
    if (m.emails?.some((e) => email === e.toLowerCase())) return true;
    if (m.nameIncludes?.some((p) => name.includes(p.toLowerCase()))) return true;
    if (m.emailIncludes?.some((p) => email.includes(p.toLowerCase()))) return true;
    return false;
}

async function applyIntern(m: Matcher) {
    const users = await prisma.user.findMany({
        select: { id: true, name: true, email: true, role: true },
    });
    const hit = users.filter((u) => matches(u, m));
    if (hit.length === 0) {
        console.log(`  ⚠ No user found for intern: ${m.label}`);
        return;
    }
    for (const u of hit) {
        await prisma.user.update({
            where: { id: u.id },
            data: { role: ROLES.INTERN },
        });
        await prisma.profile.upsert({
            where: { userId: u.id },
            create: {
                userId: u.id,
                department: "Intern",
                position: "Intern",
            },
            update: {
                department: "Intern",
                position: "Intern",
            },
        });
        console.log(`  ✓ INTERN: ${u.name} <${u.email}> (was ${u.role})`);
    }
}

async function applyRekha(m: Matcher) {
    const users = await prisma.user.findMany({
        select: { id: true, name: true, email: true, role: true },
    });
    const hit = users.filter((u) => matches(u, m));
    if (hit.length === 0) {
        console.log(`  ⚠ No user found for: ${m.label}`);
        return;
    }
    for (const u of hit) {
        await prisma.user.update({
            where: { id: u.id },
            data: {
                role: ROLES.HR_ADMIN,
                hrPermissions: JSON.stringify(HR_ADMIN_DEFAULT_PERMISSIONS),
            },
        });
        await prisma.profile.upsert({
            where: { userId: u.id },
            create: {
                userId: u.id,
                department: "HR",
                position: "HR Manager",
            },
            update: {
                department: "HR",
                position: "HR Manager",
            },
        });
        console.log(`  ✓ HR_ADMIN: ${u.name} <${u.email}> (was ${u.role})`);
    }
}

async function main() {
    console.log("Setting interns…");
    for (const m of INTERN_TARGETS) {
        await applyIntern(m);
    }

    console.log("\nSetting HR Admin…");
    for (const m of REKHA_TARGETS) {
        await applyRekha(m);
    }

    console.log("\nDone.");
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
