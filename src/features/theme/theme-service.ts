// 라이트/다크 테마 선택을 저장하고 문서 루트에 반영합니다.
import { useEffect, useState } from "react";

export type ThemeMode = "light" | "dark";

const storageKey = "household-account-theme";
const mediaQuery = "(prefers-color-scheme: dark)";

function readStoredTheme(): ThemeMode | null {
  const stored = window.localStorage.getItem(storageKey);
  return stored === "light" || stored === "dark" ? stored : null;
}

function getSystemTheme(): ThemeMode {
  return window.matchMedia(mediaQuery).matches ? "dark" : "light";
}

function getInitialTheme(): ThemeMode {
  return readStoredTheme() ?? getSystemTheme();
}

function applyTheme(theme: ThemeMode) {
  document.documentElement.classList.toggle("dark", theme === "dark");
}

export function useTheme() {
  const [theme, setTheme] = useState<ThemeMode>(() => getInitialTheme());

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    if (readStoredTheme()) return;

    const media = window.matchMedia(mediaQuery);
    const handleChange = () => setTheme(getSystemTheme());

    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, []);

  return {
    theme,
    isDark: theme === "dark",
    toggleTheme: () =>
      setTheme((current) => {
        const next = current === "dark" ? "light" : "dark";
        window.localStorage.setItem(storageKey, next);
        return next;
      }),
  };
}
