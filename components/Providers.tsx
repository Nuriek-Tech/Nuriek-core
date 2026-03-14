"use client";

import { createContext, useContext, useState } from "react";
import { SessionProvider } from "next-auth/react";

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
        <SessionProvider>
            <SidebarContext.Provider value={{ isOpen, setIsOpen, toggle }}>
                {children}
            </SidebarContext.Provider>
        </SessionProvider>
    );
}
