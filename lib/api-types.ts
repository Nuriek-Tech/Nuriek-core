import type { Role } from "@/lib/constants";

export type AttendanceLog = {
    id: string;
    checkIn: string;
    checkOut?: string | null;
    breakStart?: string | null;
    breakEnd?: string | null;
    status: string;
    note?: string | null;
};

export type LeaveRecord = {
    id: string;
    type: string;
    startDate: string;
    endDate: string;
    status: string;
    reason?: string | null;
};

export type LeaveBalance = {
    total: number;
    used: number;
    pending: number;
    remaining: number;
    byType?: { casual: number; sick: number };
};

export type TimesheetRecord = {
    id: string;
    date: string;
    tasks: string;
    hours: number;
    status: string;
};

export type UserSummary = {
    id: string;
    name: string | null;
    email: string | null;
    role: Role;
    createdAt?: string;
    profile?: {
        position?: string | null;
        department?: string | null;
        joinDate?: string | null;
    } | null;
};

export type DocumentRecord = {
    id: string;
    title: string;
    description?: string | null;
    url: string;
    type: string;
    category?: string | null;
    size: number;
    status: string;
    targetUserId?: string | null;
    targetUser?: { id: string; name: string | null; email: string | null } | null;
    updatedAt: string;
    isSigned?: boolean;
    hasRead?: boolean;
    readCompletedAt?: string | null;
    isRequiredSigner?: boolean;
    signedCount?: number;
    totalSigners?: number;
    signatures?: { id: string }[];
    requiredSigners?: { email: string; signedAt?: string | null; role?: string }[];
};

export type HolidayRecord = {
    id: string;
    name: string;
    date: string;
    type: string;
};

export type StatsSummary = {
    presentDays: number;
    lateMarks: number;
    disciplineScore: number;
    /** Weekdays in the current month (Mon–Fri). */
    totalDays?: number;
    /** Weekdays elapsed so far this month. */
    workingDaysElapsed?: number;
    totalHoursWorked?: number;
    leaveDaysThisMonth?: number;
};

export type AdminSummary = {
    totalEmployees: number;
    checkedInToday: number;
    onLeaveToday: number;
    pendingLeaves: number;
    attendanceRate: number;
    lateToday?: number;
    absentEstimate?: number;
    /** Workforce expected in office today (excludes approved leave). */
    expectedInOffice?: number;
    pendingCertificates?: number;
    pendingTimesheets?: number;
    weeklyTrend?: { label: string; count: number }[];
};

export type ReportAnalytics = {
    month: string;
    statusBreakdown: Record<string, number>;
    leaveByStatus: Record<string, number>;
    leaveByType: Record<string, number>;
    departmentStats: { department: string; records: number; late: number }[];
    topLateEmployees: { userId: string; name: string; lateCount: number }[];
    avgHoursPerSession: number;
    totalAttendanceRecords: number;
    totalLeaveRecords: number;
};

export type CertificateRequest = {
    id: string;
    type: string;
    status: string;
    purpose?: string | null;
    requestedAt: string;
    user?: { name?: string | null; email?: string | null };
};

export type InternPerformance = {
    userId: string;
    learningProgress: number;
    taskCompletion: number;
    score: number;
    duration?: string | null;
    conversionRisk: string;
    onboardingData: string;
    convertedAt?: string | null;
    conversionOfferLetterId?: string | null;
};

export type ReportRow = Record<string, string | number | boolean | null | undefined>;

export type PortalNotification = {
    id: string;
    kind: "leave" | "timesheet" | "certificate" | "document" | "attendance" | "account";
    title: string;
    body: string;
    href: string;
    createdAt: string;
};
