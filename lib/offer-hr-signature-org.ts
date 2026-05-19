import { prisma } from "@/lib/prisma";
import { isPrismaMissingColumnError } from "@/lib/prisma-errors";
import {
    isValidHrSignatureDataUrl,
    loadHrSignatureDataUrlFromDisk,
} from "@/lib/offer-hr-signature-asset";
import { resolveHrSignatureSrc } from "@/lib/offer-hr-signature";
import type { HrSignatoryPrefs } from "@/lib/offer-hr-signatory-prefs";
import { findSystemConfigSafe } from "@/lib/system-config-safe";

export type OrgHrSignatory = HrSignatoryPrefs & {
    migrationPending?: boolean;
};

export async function getOrgHrSignatory(): Promise<OrgHrSignatory> {
    const config = await findSystemConfigSafe();
    const fromDb = config?.hrSignatureDataUrl?.trim();
    const signature =
        (fromDb && isValidHrSignatureDataUrl(fromDb) ? fromDb : null) ||
        loadHrSignatureDataUrlFromDisk() ||
        "";

    return {
        hrSignatory: config?.hrSignatory?.trim() || "",
        hrSignatoryTitle: config?.hrSignatoryTitle?.trim() || "Human Resources",
        hrSignatureDataUrl: signature,
        migrationPending: config ? !config.hrSignatoryColumnsAvailable : false,
    };
}

/** Resolve signature for offer HTML: request body → org DB → disk default. */
export async function resolveHrSignatureForOffer(
    uploadedDataUrl?: string | null
): Promise<string | null> {
    const fromRequest = resolveHrSignatureSrc(uploadedDataUrl, false);
    if (fromRequest) return fromRequest;

    const org = await getOrgHrSignatory();
    return resolveHrSignatureSrc(org.hrSignatureDataUrl, false);
}

export async function saveOrgHrSignatory(prefs: Partial<OrgHrSignatory>): Promise<OrgHrSignatory> {
    const config = await findSystemConfigSafe();
    if (config && !config.hrSignatoryColumnsAvailable) {
        throw new Error(
            "HR signatory storage is not ready on the database. Run: npx prisma migrate deploy"
        );
    }

    const data: {
        hrSignatory?: string | null;
        hrSignatoryTitle?: string | null;
        hrSignatureDataUrl?: string | null;
    } = {};

    if (prefs.hrSignatory !== undefined) {
        data.hrSignatory = prefs.hrSignatory.trim() || null;
    }
    if (prefs.hrSignatoryTitle !== undefined) {
        data.hrSignatoryTitle = prefs.hrSignatoryTitle.trim() || null;
    }
    if (prefs.hrSignatureDataUrl !== undefined) {
        const sig = prefs.hrSignatureDataUrl.trim();
        if (sig && !isValidHrSignatureDataUrl(sig)) {
            throw new Error("Signature must be a PNG/JPG image under 600 KB");
        }
        data.hrSignatureDataUrl = sig || null;
    }

    try {
        await prisma.systemConfig.upsert({
            where: { id: "global" },
            create: {
                id: "global",
                ...data,
            },
            update: data,
        });
    } catch (error) {
        if (isPrismaMissingColumnError(error)) {
            throw new Error(
                "HR signatory storage is not ready on the database. Run: npx prisma migrate deploy"
            );
        }
        throw error;
    }

    return getOrgHrSignatory();
}
