import { prisma } from "@/lib/prisma";
import {
    isValidHrSignatureDataUrl,
    loadHrSignatureDataUrlFromDisk,
} from "@/lib/offer-hr-signature-asset";
import { resolveHrSignatureSrc } from "@/lib/offer-hr-signature";
import type { HrSignatoryPrefs } from "@/lib/offer-hr-signatory-prefs";

export type OrgHrSignatory = HrSignatoryPrefs;

export async function getOrgHrSignatory(): Promise<OrgHrSignatory> {
    const config = await prisma.systemConfig.findUnique({ where: { id: "global" } });
    const fromDb = config?.hrSignatureDataUrl?.trim();
    const signature =
        (fromDb && isValidHrSignatureDataUrl(fromDb) ? fromDb : null) ||
        loadHrSignatureDataUrlFromDisk() ||
        "";

    return {
        hrSignatory: config?.hrSignatory?.trim() || "",
        hrSignatoryTitle: config?.hrSignatoryTitle?.trim() || "Human Resources",
        hrSignatureDataUrl: signature,
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

    await prisma.systemConfig.upsert({
        where: { id: "global" },
        create: {
            id: "global",
            ...data,
        },
        update: data,
    });

    return getOrgHrSignatory();
}
