import { prisma } from "@/lib/prisma";
import { isPrismaMissingColumnError } from "@/lib/prisma-errors";

export type SafeSystemConfig = {
    id: string;
    officeName: string;
    workStartHour: number;
    workStartMin: number;
    workEndHour: number;
    workEndMin: number;
    flexibleRoles: string;
    lateGraceMinutes: number;
    hrSignatory: string | null;
    hrSignatoryTitle: string | null;
    hrSignatureDataUrl: string | null;
    hrSignatoryColumnsAvailable: boolean;
};

const DEFAULTS: Omit<SafeSystemConfig, "id" | "hrSignatoryColumnsAvailable"> = {
    officeName: "Bangalore (HQ)",
    workStartHour: 9,
    workStartMin: 0,
    workEndHour: 18,
    workEndMin: 0,
    flexibleRoles: "INTERN",
    lateGraceMinutes: 15,
    hrSignatory: null,
    hrSignatoryTitle: null,
    hrSignatureDataUrl: null,
};

type LegacyRow = {
    id: string;
    officeName: string | null;
    workStartHour: number | null;
    workStartMin: number | null;
    workEndHour: number | null;
    workEndMin: number | null;
    flexibleRoles: string | null;
    lateGraceMinutes: number | null;
};

/** Load SystemConfig without failing when HR signatory migration is not applied yet. */
export async function findSystemConfigSafe(): Promise<SafeSystemConfig | null> {
    try {
        const config = await prisma.systemConfig.findUnique({ where: { id: "global" } });
        if (!config) return null;
        return {
            id: config.id,
            officeName: config.officeName,
            workStartHour: config.workStartHour,
            workStartMin: config.workStartMin,
            workEndHour: config.workEndHour,
            workEndMin: config.workEndMin,
            flexibleRoles: config.flexibleRoles,
            lateGraceMinutes: config.lateGraceMinutes,
            hrSignatory: config.hrSignatory ?? null,
            hrSignatoryTitle: config.hrSignatoryTitle ?? null,
            hrSignatureDataUrl: config.hrSignatureDataUrl ?? null,
            hrSignatoryColumnsAvailable: true,
        };
    } catch (error) {
        if (!isPrismaMissingColumnError(error)) throw error;

        const rows = await prisma.$queryRaw<LegacyRow[]>`
            SELECT "id", "officeName", "workStartHour", "workStartMin", "workEndHour", "workEndMin",
                   "flexibleRoles", "lateGraceMinutes"
            FROM "SystemConfig"
            WHERE "id" = 'global'
            LIMIT 1
        `;
        const row = rows[0];
        if (!row) return null;

        return {
            id: row.id,
            officeName: row.officeName ?? DEFAULTS.officeName,
            workStartHour: row.workStartHour ?? DEFAULTS.workStartHour,
            workStartMin: row.workStartMin ?? DEFAULTS.workStartMin,
            workEndHour: row.workEndHour ?? DEFAULTS.workEndHour,
            workEndMin: row.workEndMin ?? DEFAULTS.workEndMin,
            flexibleRoles: row.flexibleRoles ?? DEFAULTS.flexibleRoles,
            lateGraceMinutes: row.lateGraceMinutes ?? DEFAULTS.lateGraceMinutes,
            hrSignatory: null,
            hrSignatoryTitle: null,
            hrSignatureDataUrl: null,
            hrSignatoryColumnsAvailable: false,
        };
    }
}

export function isHrSignatoryMigrationPending(config: SafeSystemConfig | null): boolean {
    return config !== null && !config.hrSignatoryColumnsAvailable;
}
