/** True when Postgres/Prisma reports unknown columns (migration not deployed yet). */
export function isPrismaMissingColumnError(error: unknown): boolean {
    if (!error || typeof error !== "object") return false;
    const e = error as { code?: string; message?: string };
    const msg = (e.message || "").toLowerCase();
    return (
        e.code === "P2022" ||
        msg.includes("column") && msg.includes("does not exist") ||
        msg.includes("hrsignaturedataurl") ||
        msg.includes("hrsignatory")
    );
}
