// 앱의 공통 배경과 상단 구조를 제공합니다.
import type { ReactNode } from "react";
import { CalendarDays } from "lucide-react";

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-surface text-ink">
      <header className="border-b border-line bg-surface/95">
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
          <div className="hidden rounded-lg border border-line bg-white px-3 py-2 text-sm text-muted md:block">
            IndexedDB
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-[1500px] px-4 py-5 md:px-6 md:py-6">{children}</main>
    </div>
  );
}
