import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { ADMIN_ROLES, ROLES } from "@/lib/constants";
import { REPORTING_MANAGER_ROLES } from "@/lib/reporting-manager";
import EmployeeEditor from "./EmployeeEditor";

export default async function EditEmployeePage({ params }: { params: Promise<{ id: string }> }) {
    const session = await getSessionUser();
    const role = session?.role;
    if (!role || !ADMIN_ROLES.includes(role as (typeof ADMIN_ROLES)[number])) redirect("/directory");

    const { id } = await params;
    const [employee, managers] = await Promise.all([
        prisma.user.findUnique({ where: { id }, select: { id: true, name: true, email: true, role: true, reportsToId: true, profile: { select: { position: true, department: true, phoneNumber: true, address: true, joinDate: true } } } }),
        prisma.user.findMany({ where: { isActive: true, role: { in: REPORTING_MANAGER_ROLES }, id: { not: id } }, select: { id: true, name: true, email: true, role: true }, orderBy: { name: "asc" } }),
    ]);
    if (!employee) notFound();
    if (role === ROLES.HR_ADMIN && ADMIN_ROLES.includes(employee.role as (typeof ADMIN_ROLES)[number])) redirect("/directory");

    return <EmployeeEditor employee={{ ...employee, profile: employee.profile ? { ...employee.profile, joinDate: employee.profile.joinDate.toISOString().slice(0, 10) } : null }} managers={managers} />;
}
