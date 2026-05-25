import { describe, it, expect } from "vitest";
import { buildOfferPositionHtml, type OfferLetterInput } from "./offer-letter";

const base: OfferLetterInput = {
    candidateName: "Test",
    position: "Software Engineer",
    department: "Engineering",
    employmentType: "Full-time",
    compensation: "Rs. 10,00,000",
    joiningDate: "2026-06-01",
    reportingTo: "Manager",
    workLocation: "Bangalore",
    probationMonths: 3,
    offerValidUntil: "2026-05-15",
    hrSignatory: "HR",
    refNumber: "NRK-1",
    issueDate: "2026-05-01",
};

describe("buildOfferPositionHtml", () => {
    it("returns position only by default", () => {
        expect(buildOfferPositionHtml(base)).toBe("<strong>Software Engineer</strong>");
    });

    it("uses custom role instead of catalog position when enabled", () => {
        const html = buildOfferPositionHtml({
            ...base,
            appendCustomRoleDesignation: true,
            customRoleDesignation: "Marketing Executive",
        });
        expect(html).toBe("<strong>Marketing Executive</strong>");
        expect(html).not.toContain("Software Engineer");
    });
});
