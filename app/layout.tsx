import type { Metadata } from "next";
import Script from "next/script";
import { Geist, Geist_Mono, Newsreader, DM_Sans } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const nuriekDisplay = Newsreader({
  subsets: ["latin"],
  variable: "--font-nuriek-display",
  weight: ["400", "500", "600"],
});

const nuriekBody = DM_Sans({
  subsets: ["latin"],
  variable: "--font-nuriek-body",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Nuriek Core – Company Operating System",
  description: "Internal Portal | Web-first | Mobile-ready | Role-based",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <Script id="nuriek-theme-init" strategy="beforeInteractive">
          {`(function(){try{var t=localStorage.getItem("nuriek-theme");document.documentElement.setAttribute("data-theme",t==="dark"?"dark":"light");}catch(e){document.documentElement.setAttribute("data-theme","light");}})();`}
        </Script>
      </head>
      <body
        suppressHydrationWarning
        className={`${geistSans.variable} ${geistMono.variable} ${nuriekDisplay.variable} ${nuriekBody.variable}`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
