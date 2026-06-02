// 앱의 공통 배경과 상단 구조를 제공합니다.
import type { ReactNode } from "react";
import { CalendarDays, Moon, Sun } from "lucide-react";
import type { ThemeMode } from "../features/theme/theme-service";

type AppShellProps = {
  children: ReactNode;
  theme: ThemeMode;
  onToggleTheme: () => void;
};

export function AppShell({ children, theme, onToggleTheme }: AppShellProps) {
  const isDark = theme === "dark";
  const ThemeIcon = isDark ? Sun : Moon;

  return (
    <div className="min-h-screen bg-surface text-ink">
      <header className="border-b border-line bg-surface/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between px-4 py-4 md:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-moss text-white">
              <CalendarDays size={21} aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-normal">Household Account</h1>
              <p className="text-sm text-muted">로컬 저장 가계부 달력</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-line bg-panel px-3 text-sm font-medium text-ink transition-colors hover:bg-moss-soft"
              onClick={onToggleTheme}
              aria-label={isDark ? "라이트모드로 전환" : "다크모드로 전환"}
              title={isDark ? "라이트모드로 전환" : "다크모드로 전환"}
            >
              <ThemeIcon size={17} aria-hidden="true" />
              <span className="hidden sm:inline">{isDark ? "라이트" : "다크"}</span>
            </button>
            <div className="hidden rounded-lg border border-line bg-panel px-3 py-2 text-sm text-muted md:block">
              IndexedDB
            </div>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-[1500px] px-4 py-5 md:px-6 md:py-6">{children}</main>
    </div>
  );
}
