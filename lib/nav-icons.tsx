import {
    LayoutDashboard,
    Clock,
    Users,
    GraduationCap,
    FileText,
    Calendar,
    Folder,
    FileCheck,
    FileUp,
    FileSignature,
    BarChart3,
    Settings,
    Mail,
    BadgeCheck,
    LogOut,
    LogIn,
    Award,
    Star,
    Zap,
    Trophy,
    Target,
    Heart,
    type LucideIcon,
} from "lucide-react";

/** Icons used in sidebar nav — explicit imports keep bundles small. */
export const NAV_ICON_MAP: Record<string, LucideIcon> = {
    LayoutDashboard,
    Clock,
    Users,
    GraduationCap,
    FileText,
    Calendar,
    Folder,
    FileCheck,
    FileUp,
    FileSignature,
    BarChart3,
    Settings,
    Mail,
    BadgeCheck,
    LogOut,
    LogIn,
};

/** Icons that may appear on profile badges */
export const BADGE_ICON_MAP: Record<string, LucideIcon> = {
    Award,
    Star,
    Zap,
    Trophy,
    Target,
    Heart,
    BadgeCheck,
    FileCheck,
};

type IconProps = {
    name: string;
    className?: string;
    size?: number;
};

export function NavIcon({ name, className, size = 20 }: IconProps) {
    const Icon = NAV_ICON_MAP[name];
    if (!Icon) return null;
    return <Icon className={className} size={size} />;
}

export function BadgeIcon({ name, className, size = 20 }: IconProps) {
    const Icon = BADGE_ICON_MAP[name] ?? Award;
    return <Icon className={className} size={size} />;
}
