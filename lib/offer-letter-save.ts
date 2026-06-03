import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

function errorText(error: unknown): string {
    if (error instanceof Error) return error.message;
    return String(error);
}

export function isOfferLetterSchemaError(error: unknown): boolean {
    const msg = errorText(error).toLowerCase();
    return (
        msg.includes("offerletter") ||
        msg.includes("invalid `prisma.offerletter") ||
        msg.includes("unknown argument") ||
        msg.includes("unknown arg") ||
        msg.includes("does not exist") ||
        msg.includes("column")
    );
}

export function isMissingOfferColumn(error: unknown, column: string): boolean {
    const msg = errorText(error).toLowerCase();
    const col = column.toLowerCase();
    return msg.includes(col) && isOfferLetterSchemaError(error);
}

export type CreateOfferLetterResult = {
    id: string;
    token: string;
    /** True when saved without joiningDate because the column is not migrated yet */
    omittedJoiningDate?: boolean;
};

/** Create offer row; retries without optional columns if DB migration not applied yet. */
export async function createOfferLetterRecord(
    data: Prisma.OfferLetterCreateInput
): Promise<CreateOfferLetterResult> {
    try {
        const created = await prisma.offerLetter.create({ data });
        return { id: created.id, token: created.token };
    } catch (error) {
        const joiningDate = (data as { joiningDate?: unknown }).joiningDate;
        if (
            joiningDate !== undefined &&
            joiningDate !== null &&
            isMissingOfferColumn(error, "joiningDate")
        ) {
            const { joiningDate: _drop, ...withoutJoining } = data as Prisma.OfferLetterCreateInput & {
                joiningDate?: unknown;
            };
            const created = await prisma.offerLetter.create({
                data: withoutJoining as Prisma.OfferLetterCreateInput,
            });
            return {
                id: created.id,
                token: created.token,
                omittedJoiningDate: true,
            };
        }

        throw error;
    }
}
