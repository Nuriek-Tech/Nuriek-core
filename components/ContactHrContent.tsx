"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import {
    Mail,
    Clock,
    FileQuestion,
    KeyRound,
    Calendar,
    ArrowLeft,
    ExternalLink,
} from "lucide-react";
import { NURIEK_SITE_URL } from "@/lib/nuriek-brand";

const HR_EMAIL = "hr@nuriek.com";

const TOPICS = [
    {
        icon: KeyRound,
        title: "Portal access",
        description: "Login issues, password resets, and new account setup.",
    },
    {
        icon: Calendar,
        title: "Leave & attendance",
        description: "Leave balance, approvals, and check-in questions.",
    },
    {
        icon: FileQuestion,
        title: "Documents & policies",
        description: "Handbooks, signatures, certificates, and HR letters.",
    },
];

export default function ContactHrContent() {
    const { data: session, status } = useSession();
    const isAuthed = status === "authenticated" && !!session?.user;

    const backHref = isAuthed ? "/dashboard" : "/login";
    const backLabel = isAuthed ? "Back to dashboard" : "Back to sign in";

    return (
        <main className="chrPage">
            <div className="chrShell">
                <header className="chrTop">
                    <Link href={backHref} className="chrBack">
                        <ArrowLeft size={18} />
                        {backLabel}
                    </Link>
                    <a href={NURIEK_SITE_URL} className="chrSiteLink" target="_blank" rel="noopener">
                        nuriek.com <ExternalLink size={14} />
                    </a>
                </header>

                <div className="chrGrid">
                    <section className="chrIntro">
                        <p className="chrEyebrow">People operations</p>
                        <h1 className="chrTitle">Contact HR</h1>
                        <p className="chrLead">
                            Our HR team supports Nuriek employees and interns with portal access,
                            workplace policies, and people questions.
                        </p>

                        <a href={`mailto:${HR_EMAIL}`} className="chrEmailCard">
                            <span className="chrEmailIcon">
                                <Mail size={22} />
                            </span>
                            <span>
                                <span className="chrEmailLabel">Email HR</span>
                                <span className="chrEmailValue">{HR_EMAIL}</span>
                            </span>
                        </a>

                        <div className="chrHours">
                            <Clock size={16} />
                            <span>
                                Typical response within <strong>1–2 business days</strong> (Mon–Fri,
                                IST).
                            </span>
                        </div>
                    </section>

                    <section className="chrTopics">
                        <h2 className="chrTopicsTitle">How we can help</h2>
                        <ul className="chrTopicList">
                            {TOPICS.map(({ icon: Icon, title, description }) => (
                                <li key={title} className="chrTopic">
                                    <span className="chrTopicIcon">
                                        <Icon size={18} />
                                    </span>
                                    <div>
                                        <p className="chrTopicName">{title}</p>
                                        <p className="chrTopicDesc">{description}</p>
                                    </div>
                                </li>
                            ))}
                        </ul>

                        <div className="chrNote">
                            <p>
                                Use your <strong>@nuriek.com</strong> address when emailing HR. Personal
                                emails (e.g. Gmail) are not used for Nuriek Core access.
                            </p>
                        </div>

                        <div className="chrActions">
                            <a href={`mailto:${HR_EMAIL}`} className="chrBtnPrimary">
                                <Mail size={18} />
                                Email {HR_EMAIL}
                            </a>
                            <Link href={backHref} className="chrBtnGhost">
                                {backLabel}
                            </Link>
                        </div>
                    </section>
                </div>
            </div>
        </main>
    );
}
