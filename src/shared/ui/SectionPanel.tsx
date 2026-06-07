// 작업 영역을 구분하는 공통 패널 컴포넌트입니다.
import type { ReactNode } from "react";
import { cx } from "../../lib/cx";

type SectionPanelProps = {
  title: string;
  eyebrow?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function SectionPanel({ title, eyebrow, action, children, className }: SectionPanelProps) {
  return (
    <section className={cx("min-w-0 overflow-hidden rounded-lg border border-line bg-panel shadow-panel", className)}>
      <div className="flex flex-col gap-3 border-b border-line px-3 py-3 sm:flex-row sm:items-start sm:justify-between sm:px-4">
        <div className="min-w-0">
          {eyebrow ? <p className="text-xs font-medium uppercase text-muted">{eyebrow}</p> : null}
          <h2 className="truncate text-base font-semibold">{title}</h2>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div className="p-3 sm:p-4">{children}</div>
    </section>
  );
}
