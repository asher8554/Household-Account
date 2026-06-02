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
    <section className={cx("rounded-lg border border-line bg-white shadow-panel", className)}>
      <div className="flex items-start justify-between gap-3 border-b border-line px-4 py-3">
        <div>
          {eyebrow ? <p className="text-xs font-medium uppercase text-muted">{eyebrow}</p> : null}
          <h2 className="text-base font-semibold">{title}</h2>
        </div>
        {action}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}
