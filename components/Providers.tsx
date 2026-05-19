"use client";

import { createContext, useContext, useState } from "react";
import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "@/components/ThemeProvider";

const SidebarContext = createContext<{
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
    toggle: () => void;
}>({
    isOpen: false,
    setIsOpen: () => { },
    toggle: () => { },
});

export const useSidebar = () => useContext(SidebarContext);

export function Providers({ children }: { children: React.ReactNode }) {
    const [isOpen, setIsOpen] = useState(false);
    const toggle = () => setIsOpen((prev) => !prev);

    return (
        <SessionProvider refetchOnWindowFocus={false} refetchInterval={5 * 60}>
            <ThemeProvider>
                <SidebarContext.Provider value={{ isOpen, setIsOpen, toggle }}>
                    {children}
                </SidebarContext.Provider>
            </ThemeProvider>
        </SessionProvider>
    );
}
