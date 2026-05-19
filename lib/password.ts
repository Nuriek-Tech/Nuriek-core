import crypto from "crypto";

const CHARSET = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%";

export function generateTemporaryPassword(length = 14): string {
    const bytes = crypto.randomBytes(length);
    let password = "";
    for (let i = 0; i < length; i++) {
        password += CHARSET[bytes[i]! % CHARSET.length];
    }
    return password;
}

export function validatePasswordStrength(password: string): string | null {
    if (password.length < 10) {
        return "Password must be at least 10 characters.";
    }
    if (!/[A-Z]/.test(password)) {
        return "Password must include at least one uppercase letter.";
    }
    if (!/[a-z]/.test(password)) {
        return "Password must include at least one lowercase letter.";
    }
    if (!/[0-9]/.test(password)) {
        return "Password must include at least one number.";
    }
    return null;
}
