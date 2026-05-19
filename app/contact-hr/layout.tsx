import { Newsreader, DM_Sans } from "next/font/google";
import "./contact-hr.css";

const display = Newsreader({
    subsets: ["latin"],
    variable: "--font-nuriek-display",
    weight: ["400", "500", "600"],
});

const body = DM_Sans({
    subsets: ["latin"],
    variable: "--font-nuriek-body",
    weight: ["400", "500", "600", "700"],
});

export default function ContactHrLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className={`${display.variable} ${body.variable} contactHrRoot`}>
            {children}
        </div>
    );
}
