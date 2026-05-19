import type { LucideIcon } from "lucide-react";
import { Brain, Heart, Sparkles, Users } from "lucide-react";

export const NURIEK_PSYCHOLOGY_TAGLINE = "How we grow minds at Nuriek";

export const NURIEK_PSYCHOLOGY_INTRO =
    "Nuriek Psychology is our shared language for how we work — clarity over chaos, courage over silence, and growth over perfection. It shapes how we onboard, give feedback, and build products together.";

export type PsychologyPillar = {
    id: string;
    title: string;
    subtitle: string;
    description: string;
    icon: LucideIcon;
    color: string;
    bg: string;
};

export const NURIEK_PSYCHOLOGY_PILLARS: PsychologyPillar[] = [
    {
        id: "safety",
        title: "Psychological safety",
        subtitle: "Speak up, ask early",
        description:
            "Questions are signals of care, not weakness. We prefer honest uncertainty over silent assumptions.",
        icon: Heart,
        color: "#ff6b9d",
        bg: "rgba(255, 107, 157, 0.12)",
    },
    {
        id: "growth",
        title: "Growth mindset",
        subtitle: "Skills are built",
        description:
            "Feedback is fuel. Every sprint is a chance to learn — for interns, leads, and the whole team.",
        icon: Sparkles,
        color: "#bf5af2",
        bg: "rgba(191, 90, 242, 0.12)",
    },
    {
        id: "clarity",
        title: "Clarity & calm",
        subtitle: "Sustainable pace",
        description:
            "Clear goals, respectful async communication, and focus time protect the quality of our thinking.",
        icon: Brain,
        color: "#3d5248",
        bg: "rgba(0, 163, 255, 0.12)",
    },
    {
        id: "belonging",
        title: "Belonging",
        subtitle: "Every voice counts",
        description:
            "Diverse perspectives shape better products. You belong here before you feel “ready”.",
        icon: Users,
        color: "#34c759",
        bg: "rgba(52, 199, 89, 0.12)",
    },
];

export const DEFAULT_INTERN_ONBOARDING_CHECKLIST = [
    { task: "Read Nuriek Psychology & team norms", done: false },
    { task: "Complete portal walkthrough with your buddy", done: false },
    { task: "Set up dev environment & access", done: false },
    { task: "Sign required HR documents", done: false },
    { task: "First 1:1 with your manager", done: false },
    { task: "Ship your first small contribution", done: false },
];

export const INTERN_WELCOME_STEPS = [
    {
        id: "welcome",
        title: "Welcome to Nuriek",
        lead: "Your internship is a designed learning journey — not a test of perfection.",
    },
    {
        id: "psychology",
        title: "Nuriek Psychology",
        lead: "These four pillars guide how we collaborate, learn, and give feedback.",
    },
    {
        id: "portal",
        title: "Your portal toolkit",
        lead: "Everything you need for attendance, documents, and growth lives in Nuriek Core.",
    },
    {
        id: "begin",
        title: "You're ready",
        lead: "Your manager will track onboarding milestones with you. Start with curiosity.",
    },
] as const;

export const LOGIN_PSYCHOLOGY_QUOTE = {
    text: "We hire for potential and train for mastery — the portal is where your growth becomes visible.",
    attribution: "Nuriek People Philosophy",
};
