"use client";

import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";

type Theme = "light" | "dark";

type ThemeContextValue = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  isReady: boolean;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const STORAGE_KEY = "mion-blog-theme";

function getInitialTheme(): Theme {
  if (typeof window === "undefined") {
    return "light";
  }

  const stored = window.localStorage.getItem(STORAGE_KEY) as Theme | null;
  if (stored === "light" || stored === "dark") {
    return stored;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("light");
  const [isReady, setIsReady] = useState(false);
  const [hasUserPreference, setHasUserPreference] = useState(false);

  useEffect(() => {
    const stored = (typeof window !== "undefined"
      ? (window.localStorage.getItem(STORAGE_KEY) as Theme | null)
      : null);

    if (stored === "light" || stored === "dark") {
      setThemeState(stored);
      setHasUserPreference(true);
    } else {
      setThemeState(getInitialTheme());
    }

    setIsReady(true);
  }, []);

  useEffect(() => {
    if (!isReady) return;

    const root = document.documentElement;
    root.setAttribute("data-theme", theme);

    if (hasUserPreference) {
      window.localStorage.setItem(STORAGE_KEY, theme);
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, [theme, isReady, hasUserPreference]);

  useEffect(() => {
    if (!isReady) return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (event: MediaQueryListEvent) => {
      if (!hasUserPreference) {
        setThemeState(event.matches ? "dark" : "light");
      }
    };

    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, [isReady, hasUserPreference]);

  const setTheme = (next: Theme) => {
    setHasUserPreference(true);
    window.localStorage.setItem(STORAGE_KEY, next);
    setThemeState(next);
  };

  const toggleTheme = () => {
    setThemeState((prev) => {
      const next = prev === "light" ? "dark" : "light";
      window.localStorage.setItem(STORAGE_KEY, next);
      return next;
    });
    setHasUserPreference(true);
  };

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, setTheme, toggleTheme, isReady }),
    [theme, isReady]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme는 ThemeProvider 내부에서만 사용할 수 있습니다.");
  }

  return context;
}
