// 앱의 공통 배경과 상단 구조를 제공합니다.
import { useCallback, useEffect, useRef, type MouseEvent, type ReactNode } from "react";
import { CalendarDays, Moon, Sun } from "lucide-react";
import type { ThemeMode } from "../features/theme/theme-service";
import { appViewLabels, type AppView, visibleAppViews } from "./app-navigation";
import { cx } from "../lib/cx";

const ADMIN_ICON_LONG_PRESS_MS = 5000;

type AppShellProps = {
  children: ReactNode;
  currentView: AppView;
  theme: ThemeMode;
  onChangeView: (view: AppView) => void;
  onOpenAdminView: () => void;
  onToggleTheme: () => void;
};

export function AppShell({
  children,
  currentView,
  theme,
  onChangeView,
  onOpenAdminView,
  onToggleTheme,
}: AppShellProps) {
  const isDark = theme === "dark";
  const ThemeIcon = isDark ? Sun : Moon;
  const adminIconTimerRef = useRef<ReturnType<typeof window.setTimeout> | null>(null);

  const clearAdminPressTimer = useCallback(() => {
    if (adminIconTimerRef.current === null) return;

    window.clearTimeout(adminIconTimerRef.current);
    adminIconTimerRef.current = null;
  }, []);

  const startAdminPressTimer = useCallback(() => {
    clearAdminPressTimer();

    adminIconTimerRef.current = window.setTimeout(() => {
      adminIconTimerRef.current = null;
      onOpenAdminView();
    }, ADMIN_ICON_LONG_PRESS_MS);
  }, [clearAdminPressTimer, onOpenAdminView]);

  useEffect(() => clearAdminPressTimer, [clearAdminPressTimer]);

  function handleAdminIconMouseDown(event: MouseEvent<HTMLButtonElement>) {
    if (event.button !== 0) return;

    startAdminPressTimer();
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-surface text-ink">
      <header className="border-b border-line bg-surface/95 backdrop-blur">
        <div className="mx-auto grid w-full max-w-[1500px] gap-4 px-3 py-4 sm:px-4 md:px-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                className="flex h-10 w-10 shrink-0 touch-none select-none items-center justify-center rounded-lg bg-moss text-white transition-colors hover:bg-moss-hover focus:outline-none focus:ring-2 focus:ring-mint focus:ring-offset-2 focus:ring-offset-surface"
                aria-label="앱 아이콘"
                onMouseDown={handleAdminIconMouseDown}
                onMouseUp={clearAdminPressTimer}
                onMouseLeave={clearAdminPressTimer}
                onTouchStart={startAdminPressTimer}
                onTouchEnd={clearAdminPressTimer}
                onTouchCancel={clearAdminPressTimer}
                onBlur={clearAdminPressTimer}
                onContextMenu={(event) => event.preventDefault()}
              >
                <CalendarDays size={21} aria-hidden="true" />
              </button>
              <div className="min-w-0">
                <h1 className="truncate text-lg font-semibold tracking-normal">Household Account</h1>
                <p className="text-sm text-muted">가계부 달력</p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
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
          <nav className="flex gap-2 overflow-x-auto pb-1" aria-label="앱 화면">
            {visibleAppViews.map((view) => (
              <button
                key={view}
                type="button"
                className={cx(
                  "h-9 shrink-0 rounded-lg border px-3 text-sm font-medium transition-colors",
                  currentView === view
                    ? "border-moss bg-moss text-white"
                    : "border-line bg-panel text-muted hover:bg-moss-soft hover:text-ink",
                )}
                onClick={() => onChangeView(view)}
              >
                {appViewLabels[view]}
              </button>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-[1500px] px-3 py-4 sm:px-4 md:px-6 md:py-6">{children}</main>
    </div>
  );
}
