"use client";

import { createContext, useContext, useEffect, useState } from "react";

export type Theme = "dark" | "light";

const STORAGE_KEY = "nuriek-theme";

type ThemeContextValue = {
    theme: Theme;
    setTheme: (theme: Theme) => void;
    toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue>({
    theme: "light",
    setTheme: () => {},
    toggleTheme: () => {},
});

export function useTheme() {
    return useContext(ThemeContext);
}

function applyTheme(theme: Theme) {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(STORAGE_KEY, theme);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setThemeState] = useState<Theme>("light");

    useEffect(() => {
        const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
        const initial: Theme = stored === "light" || stored === "dark" ? stored : "light";
        setThemeState(initial);
        applyTheme(initial);
    }, []);

    const setTheme = (next: Theme) => {
        setThemeState(next);
        applyTheme(next);
    };

    const toggleTheme = () => {
        setThemeState((prev) => {
            const next = prev === "dark" ? "light" : "dark";
            applyTheme(next);
            return next;
        });
    };

    return (
        <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}
