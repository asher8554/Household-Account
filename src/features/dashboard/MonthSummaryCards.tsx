// 월간 수입, 지출, 순액, 일평균 지출을 요약합니다.
import { ArrowDownRight, ArrowUpRight, ReceiptText, WalletCards } from "lucide-react";
import { formatKrw, formatSignedKrw } from "../../lib/money";
import type { MonthSummary } from "./dashboard-calculations";

type MonthSummaryCardsProps = {
  summary: MonthSummary;
};

export function MonthSummaryCards({ summary }: MonthSummaryCardsProps) {
  const items = [
    {
      label: "수입",
      value: formatKrw(summary.income),
      icon: ArrowUpRight,
      tone: "text-mint",
    },
    {
      label: "지출",
      value: formatKrw(summary.expense),
      icon: ArrowDownRight,
      tone: "text-coral",
    },
    {
      label: "순액",
      value: formatSignedKrw(summary.net),
      icon: WalletCards,
      tone: summary.net >= 0 ? "text-mint" : "text-coral",
    },
    {
      label: "일평균 지출",
      value: formatKrw(summary.dailyAverageExpense),
      icon: ReceiptText,
      tone: "text-honey",
    },
  ];

  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => {
        const Icon = item.icon;

        return (
          <article key={item.label} className="rounded-lg border border-line bg-panel px-4 py-3 shadow-panel">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm text-muted">{item.label}</p>
                <p className="mt-1 text-xl font-semibold tracking-normal">{item.value}</p>
              </div>
              <Icon className={item.tone} size={22} aria-hidden="true" />
            </div>
          </article>
        );
      })}
    </section>
  );
}
