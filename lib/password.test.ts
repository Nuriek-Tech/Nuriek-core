import { describe, it, expect } from "vitest";
import { generateTemporaryPassword, validatePasswordStrength } from "./password";

describe("generateTemporaryPassword", () => {
    it("generates password of requested length", () => {
        expect(generateTemporaryPassword(16)).toHaveLength(16);
    });
});

describe("validatePasswordStrength", () => {
    it("rejects short passwords", () => {
        expect(validatePasswordStrength("Ab1")).toMatch(/at least 10/);
    });

    it("accepts strong passwords", () => {
        expect(validatePasswordStrength("Str0ngPass!")).toBeNull();
    });
});
