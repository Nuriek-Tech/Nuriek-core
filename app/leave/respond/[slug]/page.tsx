import Link from "next/link";
import { CheckCircle2, XCircle, AlertCircle, Clock } from "lucide-react";
import "./leave-respond.css";

type Props = {
    params: Promise<{ slug: string }>;
    searchParams: Promise<{ employee?: string; status?: string }>;
};

function decodeParam(value?: string): string {
    if (!value) return "";
    try {
        return decodeURIComponent(value);
    } catch {
        return value;
    }
}

export default async function LeaveRespondPage({ params, searchParams }: Props) {
    const { slug } = await params;
    const query = await searchParams;
    const employee = decodeParam(query.employee);
    const priorStatus = decodeParam(query.status);

    let title = "Leave response";
    let message = "This link is no longer valid.";
    let Icon = AlertCircle;
    let tone: "success" | "error" | "neutral" = "neutral";

    switch (slug) {
        case "approved":
            title = "Leave approved";
            message = employee
                ? `${employee}'s leave has been approved and applied in Nuriek Core.`
                : "The leave request has been approved and applied in Nuriek Core.";
            Icon = CheckCircle2;
            tone = "success";
            break;
        case "rejected":
            title = "Leave rejected";
            message = employee
                ? `${employee}'s leave request has been rejected.`
                : "The leave request has been rejected.";
            Icon = XCircle;
            tone = "error";
            break;
        case "expired":
            title = "Link expired";
            message = "This approval link has expired. Ask the employee to submit a new request or contact HR.";
            Icon = Clock;
            break;
        case "used":
            title = "Already processed";
            message = priorStatus
                ? `This leave request was already marked as ${priorStatus.toLowerCase()}.`
                : "This leave request was already processed.";
            Icon = AlertCircle;
            break;
        case "invalid":
            title = "Invalid link";
            message = "We could not find this approval link. It may have been replaced by a newer request.";
            Icon = AlertCircle;
            break;
        case "error":
            title = "Something went wrong";
            message = "We could not update this leave request. Please try again or contact HR.";
            Icon = AlertCircle;
            tone = "error";
            break;
        default:
            break;
    }

    return (
        <main className="leaveRespondPage">
            <div className={`leaveRespondCard leaveRespondCard--${tone}`}>
                <Icon size={40} className="leaveRespondIcon" aria-hidden />
                <h1>{title}</h1>
                <p>{message}</p>
                <Link href="/login" className="leaveRespondLink">
                    Sign in to Nuriek Core
                </Link>
            </div>
        </main>
    );
}
