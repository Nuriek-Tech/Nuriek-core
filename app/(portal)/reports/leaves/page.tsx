import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import LeaveReportClient from "./LeaveReportClient";

export default function LeaveReportPage() {
    return (
        <Suspense
            fallback={
                <div className="repLoading" style={{ minHeight: "40vh" }}>
                    <Loader2 className="animate-spin" size={32} />
                </div>
            }
        >
            <LeaveReportClient />
        </Suspense>
    );
}
