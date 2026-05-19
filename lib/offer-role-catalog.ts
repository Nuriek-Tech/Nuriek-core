/**
 * Offer letter — departments, positions, and salary grades.
 * Grade options update when position changes.
 */

export type SalaryGradeOption = {
    code: string;
    label: string;
    /** Suggested CTC text for the offer form */
    compensationHint?: string;
};

export type OfferRoleDefinition = {
    title: string;
    department: string;
    grades: SalaryGradeOption[];
    defaultGrade: string;
};

export const OFFER_DEPARTMENTS = [
    "Engineering",
    "Product",
    "Design",
    "Research & Psychology",
    "Human Resources",
    "Operations",
    "Sales & Marketing",
    "Finance",
    "Legal & Compliance",
] as const;

export type OfferDepartment = (typeof OFFER_DEPARTMENTS)[number];

const G = (
    code: string,
    compensationHint?: string
): SalaryGradeOption => ({
    code,
    label: code,
    compensationHint,
});

/** Positions with grade ladders per department */
export const OFFER_ROLES: OfferRoleDefinition[] = [
    // Engineering
    {
        title: "Software Engineer",
        department: "Engineering",
        defaultGrade: "E2",
        grades: [
            G("E1", "Rs. 6,00,000 per annum"),
            G("E2", "Rs. 10,00,000 per annum"),
            G("E3", "Rs. 14,00,000 per annum"),
            G("E4", "Rs. 18,00,000 per annum"),
        ],
    },
    {
        title: "Senior Software Engineer",
        department: "Engineering",
        defaultGrade: "E3",
        grades: [
            G("E3", "Rs. 14,00,000 per annum"),
            G("E4", "Rs. 18,00,000 per annum"),
            G("E5", "Rs. 24,00,000 per annum"),
        ],
    },
    {
        title: "Engineering Manager",
        department: "Engineering",
        defaultGrade: "M1",
        grades: [
            G("M1", "Rs. 22,00,000 per annum"),
            G("M2", "Rs. 28,00,000 per annum"),
            G("M3", "Rs. 36,00,000 per annum"),
        ],
    },
    {
        title: "Senior Engineering Manager",
        department: "Engineering",
        defaultGrade: "M2",
        grades: [
            G("M2", "Rs. 28,00,000 per annum"),
            G("M3", "Rs. 36,00,000 per annum"),
            G("M4", "Rs. 45,00,000 per annum"),
        ],
    },
    {
        title: "Software Engineering Intern",
        department: "Engineering",
        defaultGrade: "I1",
        grades: [G("I1", "Rs. 25,000 per month stipend"), G("I2", "Rs. 35,000 per month stipend")],
    },
    {
        title: "DevOps Engineer",
        department: "Engineering",
        defaultGrade: "E2",
        grades: [
            G("E2", "Rs. 11,00,000 per annum"),
            G("E3", "Rs. 15,00,000 per annum"),
            G("E4", "Rs. 20,00,000 per annum"),
        ],
    },
    // Product
    {
        title: "Product Manager",
        department: "Product",
        defaultGrade: "P2",
        grades: [
            G("P1", "Rs. 12,00,000 per annum"),
            G("P2", "Rs. 16,00,000 per annum"),
            G("P3", "Rs. 22,00,000 per annum"),
        ],
    },
    {
        title: "Associate Product Manager",
        department: "Product",
        defaultGrade: "P1",
        grades: [G("P1", "Rs. 10,00,000 per annum"), G("P2", "Rs. 14,00,000 per annum")],
    },
    {
        title: "Product Analyst",
        department: "Product",
        defaultGrade: "P1",
        grades: [G("P1", "Rs. 8,00,000 per annum"), G("P2", "Rs. 12,00,000 per annum")],
    },
    {
        title: "Senior Product Manager",
        department: "Product",
        defaultGrade: "M1",
        grades: [
            G("M1", "Rs. 20,00,000 per annum"),
            G("M2", "Rs. 26,00,000 per annum"),
            G("M3", "Rs. 32,00,000 per annum"),
        ],
    },
    {
        title: "Director of Product",
        department: "Product",
        defaultGrade: "M2",
        grades: [
            G("M2", "Rs. 30,00,000 per annum"),
            G("M3", "Rs. 38,00,000 per annum"),
            G("M4", "Rs. 48,00,000 per annum"),
        ],
    },
    // Design
    {
        title: "Product Designer",
        department: "Design",
        defaultGrade: "D2",
        grades: [
            G("D1", "Rs. 8,00,000 per annum"),
            G("D2", "Rs. 12,00,000 per annum"),
            G("D3", "Rs. 16,00,000 per annum"),
        ],
    },
    {
        title: "UX Researcher",
        department: "Design",
        defaultGrade: "D2",
        grades: [G("D1", "Rs. 9,00,000 per annum"), G("D2", "Rs. 13,00,000 per annum")],
    },
    {
        title: "Design Manager",
        department: "Design",
        defaultGrade: "M1",
        grades: [
            G("M1", "Rs. 18,00,000 per annum"),
            G("M2", "Rs. 24,00,000 per annum"),
            G("M3", "Rs. 30,00,000 per annum"),
        ],
    },
    // Research & Psychology
    {
        title: "Research Associate",
        department: "Research & Psychology",
        defaultGrade: "R2",
        grades: [
            G("R1", "Rs. 7,00,000 per annum"),
            G("R2", "Rs. 10,00,000 per annum"),
            G("R3", "Rs. 14,00,000 per annum"),
        ],
    },
    {
        title: "Clinical Psychology Associate",
        department: "Research & Psychology",
        defaultGrade: "R2",
        grades: [
            G("R2", "Rs. 11,00,000 per annum"),
            G("R3", "Rs. 15,00,000 per annum"),
        ],
    },
    {
        title: "Research Manager",
        department: "Research & Psychology",
        defaultGrade: "M1",
        grades: [
            G("M1", "Rs. 16,00,000 per annum"),
            G("M2", "Rs. 22,00,000 per annum"),
            G("M3", "Rs. 28,00,000 per annum"),
        ],
    },
    // Human Resources
    {
        title: "HR Executive",
        department: "Human Resources",
        defaultGrade: "H2",
        grades: [
            G("H1", "Rs. 5,00,000 per annum"),
            G("H2", "Rs. 7,50,000 per annum"),
            G("H3", "Rs. 10,00,000 per annum"),
        ],
    },
    {
        title: "HR Manager",
        department: "Human Resources",
        defaultGrade: "M1",
        grades: [
            G("M1", "Rs. 14,00,000 per annum"),
            G("M2", "Rs. 18,00,000 per annum"),
            G("M3", "Rs. 24,00,000 per annum"),
        ],
    },
    {
        title: "Head of Human Resources",
        department: "Human Resources",
        defaultGrade: "M2",
        grades: [
            G("M2", "Rs. 22,00,000 per annum"),
            G("M3", "Rs. 28,00,000 per annum"),
            G("M4", "Rs. 35,00,000 per annum"),
        ],
    },
    // Operations
    {
        title: "Operations Executive",
        department: "Operations",
        defaultGrade: "O2",
        grades: [
            G("O1", "Rs. 4,50,000 per annum"),
            G("O2", "Rs. 6,50,000 per annum"),
            G("O3", "Rs. 9,00,000 per annum"),
        ],
    },
    {
        title: "Office Manager",
        department: "Operations",
        defaultGrade: "O2",
        grades: [G("O2", "Rs. 7,00,000 per annum"), G("O3", "Rs. 10,00,000 per annum")],
    },
    {
        title: "Operations Manager",
        department: "Operations",
        defaultGrade: "M1",
        grades: [
            G("M1", "Rs. 12,00,000 per annum"),
            G("M2", "Rs. 16,00,000 per annum"),
            G("M3", "Rs. 20,00,000 per annum"),
        ],
    },
    // Sales & Marketing
    {
        title: "Marketing Executive",
        department: "Sales & Marketing",
        defaultGrade: "S2",
        grades: [
            G("S1", "Rs. 5,00,000 per annum"),
            G("S2", "Rs. 8,00,000 per annum"),
            G("S3", "Rs. 12,00,000 per annum"),
        ],
    },
    {
        title: "Business Development Manager",
        department: "Sales & Marketing",
        defaultGrade: "S3",
        grades: [
            G("S2", "Rs. 10,00,000 per annum"),
            G("S3", "Rs. 15,00,000 per annum"),
            G("S4", "Rs. 20,00,000 per annum"),
        ],
    },
    {
        title: "Marketing Manager",
        department: "Sales & Marketing",
        defaultGrade: "M1",
        grades: [
            G("M1", "Rs. 14,00,000 per annum"),
            G("M2", "Rs. 18,00,000 per annum"),
            G("M3", "Rs. 24,00,000 per annum"),
        ],
    },
    {
        title: "Sales Manager",
        department: "Sales & Marketing",
        defaultGrade: "M1",
        grades: [
            G("M1", "Rs. 15,00,000 per annum"),
            G("M2", "Rs. 20,00,000 per annum"),
            G("M3", "Rs. 26,00,000 per annum"),
        ],
    },
    // Finance
    {
        title: "Finance Analyst",
        department: "Finance",
        defaultGrade: "F2",
        grades: [
            G("F1", "Rs. 6,00,000 per annum"),
            G("F2", "Rs. 9,00,000 per annum"),
            G("F3", "Rs. 13,00,000 per annum"),
        ],
    },
    {
        title: "Accountant",
        department: "Finance",
        defaultGrade: "F1",
        grades: [G("F1", "Rs. 5,50,000 per annum"), G("F2", "Rs. 8,00,000 per annum")],
    },
    {
        title: "Finance Manager",
        department: "Finance",
        defaultGrade: "M1",
        grades: [
            G("M1", "Rs. 16,00,000 per annum"),
            G("M2", "Rs. 22,00,000 per annum"),
            G("M3", "Rs. 28,00,000 per annum"),
        ],
    },
    // Legal & Compliance
    {
        title: "Legal Associate",
        department: "Legal & Compliance",
        defaultGrade: "L2",
        grades: [
            G("L1", "Rs. 8,00,000 per annum"),
            G("L2", "Rs. 12,00,000 per annum"),
            G("L3", "Rs. 18,00,000 per annum"),
        ],
    },
    {
        title: "Legal Manager",
        department: "Legal & Compliance",
        defaultGrade: "M1",
        grades: [
            G("M1", "Rs. 18,00,000 per annum"),
            G("M2", "Rs. 24,00,000 per annum"),
            G("M3", "Rs. 30,00,000 per annum"),
        ],
    },
];

export type OfferFormFields = {
    candidateName: string;
    department: string;
    position: string;
    salaryGrade: string;
    compensation: string;
    employmentType?: string;
    internshipType?: string | null;
    internshipMonths?: string | number;
};

/** Resolve compensation from grade hint when the field was left empty */
export function resolveOfferCompensation(fields: OfferFormFields): string {
    const trimmed = fields.compensation.trim();
    if (trimmed) return trimmed;
    return (
        getCompensationHintForGrade(fields.department, fields.position, fields.salaryGrade) ?? ""
    );
}

export function getOfferFormReadiness(fields: OfferFormFields): {
    ready: boolean;
    missing: string[];
    compensation: string;
} {
    const missing: string[] = [];
    const isIntern = fields.employmentType?.trim().toLowerCase() === "intern";
    const isUnpaidIntern =
        isIntern && fields.internshipType?.trim().toLowerCase() === "unpaid";

    if (!fields.candidateName.trim()) missing.push("Candidate name");
    if (!fields.department.trim()) missing.push("Department");
    if (!fields.position.trim()) missing.push("Position");
    if (isIntern) {
        const months = Number(fields.internshipMonths);
        if (!Number.isFinite(months) || months < 1) missing.push("Internship duration (months)");
    }
    if (!isUnpaidIntern && !fields.salaryGrade.trim()) missing.push("Salary grade");

    const compensation = resolveOfferCompensation(fields);
    if (!isUnpaidIntern && !compensation) {
        missing.push(isIntern ? "Stipend" : "Compensation");
    }

    return { ready: missing.length === 0, missing, compensation };
}

export function getPositionsForDepartment(department: string): OfferRoleDefinition[] {
    return OFFER_ROLES.filter((r) => r.department === department);
}

export function findOfferRole(
    department: string,
    positionTitle: string
): OfferRoleDefinition | undefined {
    return OFFER_ROLES.find((r) => r.department === department && r.title === positionTitle);
}

export function getDefaultRoleForDepartment(department: string): OfferRoleDefinition | undefined {
    return getPositionsForDepartment(department)[0];
}

export function getGradeOptions(
    department: string,
    positionTitle: string
): SalaryGradeOption[] {
    return findOfferRole(department, positionTitle)?.grades ?? [];
}

export function getCompensationHintForGrade(
    department: string,
    positionTitle: string,
    gradeCode: string
): string | undefined {
    const role = findOfferRole(department, positionTitle);
    return role?.grades.find((g) => g.code === gradeCode)?.compensationHint;
}

/** Apply department change — resets position & grade to department defaults */
export function roleDefaultsForDepartment(department: string): {
    position: string;
    salaryGrade: string;
    compensation: string;
} {
    const role = getDefaultRoleForDepartment(department);
    if (!role) {
        return { position: "", salaryGrade: "", compensation: "" };
    }
    const grade = role.grades.find((g) => g.code === role.defaultGrade);
    return {
        position: role.title,
        salaryGrade: role.defaultGrade,
        compensation: grade?.compensationHint ?? "",
    };
}

/** Apply position change — resets grade & optional compensation hint */
export function roleDefaultsForPosition(
    department: string,
    positionTitle: string
): { salaryGrade: string; compensation: string } {
    const role = findOfferRole(department, positionTitle);
    if (!role) {
        return { salaryGrade: "", compensation: "" };
    }
    const grade = role.grades.find((g) => g.code === role.defaultGrade);
    return {
        salaryGrade: role.defaultGrade,
        compensation: grade?.compensationHint ?? "",
    };
}
