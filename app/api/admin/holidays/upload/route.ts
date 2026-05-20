import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin, isNextResponse } from "@/lib/rbac";
import { parseHolidayList, calendarYearOf } from "@/lib/holiday-import";
import { logAudit } from "@/lib/audit";

export async function POST(req: Request) {
    const user = await requireSuperAdmin();
    if (isNextResponse(user)) return user;

    try {
        const body = await req.json();
        const csv = String(body.csv ?? "");
        const replaceYear =
            body.replaceYear != null ? Number(body.replaceYear) : undefined;

        if (!csv.trim()) {
            return NextResponse.json({ error: "Holiday list is empty" }, { status: 400 });
        }

        const { rows, errors } = parseHolidayList(csv);
        if (rows.length === 0) {
            return NextResponse.json(
                { error: "No valid holidays found", details: errors },
                { status: 400 }
            );
        }

        const publishedAt = new Date();
        const years = new Set(rows.map((r) => calendarYearOf(r.date)));
        const targetYears =
            replaceYear != null && !Number.isNaN(replaceYear)
                ? [replaceYear]
                : [...years];

        await prisma.$transaction(async (tx) => {
            for (const year of targetYears) {
                const yearStart = new Date(year, 0, 1);
                const yearEnd = new Date(year, 11, 31, 23, 59, 59, 999);
                await tx.holiday.deleteMany({
                    where: {
                        date: { gte: yearStart, lte: yearEnd },
                    },
                });
            }

            const toInsert = rows.filter((r) =>
                replaceYear != null && !Number.isNaN(replaceYear)
                    ? calendarYearOf(r.date) === replaceYear
                    : true
            );

            if (toInsert.length > 0) {
                await tx.holiday.createMany({
                    data: toInsert.map((r) => ({
                        name: r.name,
                        date: r.date,
                        type: r.type,
                        publishedAt,
                    })),
                });
            }
        });

        await logAudit({
            actorId: user.id,
            actorEmail: user.email,
            action: "HOLIDAY_LIST_PUBLISH",
            entity: "Holiday",
            metadata: {
                count: rows.length,
                years: [...years],
                replaceYear: replaceYear ?? null,
            },
        });

        return NextResponse.json({
            success: true,
            published: rows.length,
            years: [...years],
            warnings: errors,
        });
    } catch (error) {
        console.error("[holidays/upload]", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
