import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import InternOnboardingGate from "@/components/InternOnboardingGate";
import InactivityGuard from "@/components/InactivityGuard";
import "./layout.css";

export default function PortalLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="portalWrapper">
            <Sidebar />
            <div className="mainContent">
                <Header />
                <main className="page">{children}</main>
            </div>
            <InternOnboardingGate />
            <InactivityGuard />
        </div>
    );
}
