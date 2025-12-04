"use client";

import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";

type Theme = "light" | "dark";

type ThemeContextValue = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  isReady: boolean;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const STORAGE_KEY = "mion-blog-theme";

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("dark");
  const [isReady, setIsReady] = useState(false);

  // 다크모드 강제 고정: 마운트 시 항상 dark로 설정
  useEffect(() => {
    setThemeState("dark");
    const root = document.documentElement;
    root.setAttribute("data-theme", "dark");
    try {
      window.localStorage.setItem(STORAGE_KEY, "dark");
    } catch {
      // 로컬 스토리지가 막힌 경우 무시
    }
    setIsReady(true);
  }, []);

  // data-theme 동기화 (보수적 유지)
  useEffect(() => {
    if (!isReady) return;
    const root = document.documentElement;
    if (root.getAttribute("data-theme") !== "dark") {
      root.setAttribute("data-theme", "dark");
    }
  }, [isReady, theme]);

  // 외부에서 호출되어도 항상 dark 유지
  const stableSetTheme = useCallback(() => {
    setThemeState("dark");
    try { window.localStorage.setItem(STORAGE_KEY, "dark"); } catch {
      // 로컬 스토리지가 막힌 경우 무시
    }
    const root = document.documentElement;
    root.setAttribute("data-theme", "dark");
  }, []);
  const toggleTheme = useCallback(() => stableSetTheme(), [stableSetTheme]);

  const value = useMemo<ThemeContextValue>(
    () => ({ theme: "dark", setTheme: stableSetTheme, toggleTheme, isReady }),
    [isReady, stableSetTheme, toggleTheme]
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
