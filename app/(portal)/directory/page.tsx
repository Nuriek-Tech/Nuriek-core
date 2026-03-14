import Link from "next/link";
import { User, Mail, Shield, ChevronRight, UserPlus, Trash2, Loader2 } from "lucide-react";
import "@/styles/directory.css";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ROLES } from "@/lib/constants";
import DeleteUserButton from "./DeleteUserButton";

export default async function DirectoryPage() {
    const session = await getServerSession(authOptions);
    const canOnboard = session?.user && [ROLES.FOUNDER, ROLES.HR_ADMIN].includes((session.user as any).role);
    const isSuperAdmin = canOnboard;

    const employees = await prisma.user.findMany({
        orderBy: {
            name: "asc",
        },
    });

    return (
        <div className="directoryContainer">
            <header className="dashboardHeader">
                <div className="welcomeSection">
                    <h1>Employee Directory</h1>
                    <p>Browse and connect with the Nuriek team</p>
                </div>
                {canOnboard && (
                    <Link href="/directory/onboard" className="checkInButton">
                        <UserPlus size={18} />
                        <span>Onboard New Employee</span>
                    </Link>
                )}
            </header>

            <div className="employeeGrid">
                {employees.map((employee) => (
                    <div key={employee.id} className="employeeCard glass">
                        <div className="profilePic">
                            {employee.name?.charAt(0) || "U"}
                        </div>
                        <div className="employeeInfo">
                            <span className="name">{employee.name}</span>
                            <span className="role">{employee.role.replace("_", " ")}</span>
                            <span className="email">{employee.email}</span>
                        </div>
                        <div className="cardFooter">
                            <Link href={`/profile/${employee.id}`} className="viewProfileBtn">
                                <span>View Profile</span>
                                <ChevronRight size={16} />
                            </Link>
                            {isSuperAdmin && (
                                <DeleteUserButton userId={employee.id} />
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
