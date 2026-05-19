import { prisma } from "../lib/prisma";

async function main() {
    const docs = await prisma.document.findMany({
        orderBy: { createdAt: "desc" },
        take: 15,
    });
    console.log(JSON.stringify(docs, null, 2));
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
