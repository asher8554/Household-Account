// 월간 수입, 지출, 순액, 일평균 지출과 카드별 사용금액을 요약합니다.
import { ArrowDownRight, ArrowUpRight, CreditCard, ReceiptText, WalletCards } from "lucide-react";
import { formatKrw, formatSignedKrw } from "../../lib/money";
import type { MonthSummary } from "./dashboard-calculations";

type MonthSummaryCardsProps = {
  summary: MonthSummary;
};

export function MonthSummaryCards({ summary }: MonthSummaryCardsProps) {
  const cardExpenseTotal = summary.cardExpenses.reduce((sum, item) => sum + item.amount, 0);
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
    <section className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => {
        const Icon = item.icon;

        return (
          <article key={item.label} className="min-w-0 overflow-hidden rounded-lg border border-line bg-panel px-3 py-3 shadow-panel sm:px-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm text-muted">{item.label}</p>
                <p className="mt-1 break-words text-lg font-semibold tracking-normal sm:text-xl">{item.value}</p>
              </div>
              <Icon className={item.tone} size={22} aria-hidden="true" />
            </div>
          </article>
        );
      })}
      <article className="min-w-0 overflow-hidden rounded-lg border border-line bg-panel px-3 py-3 shadow-panel sm:col-span-2 sm:px-4 xl:col-span-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm text-muted">카드별 사용금액</p>
            <p className="mt-1 break-words text-lg font-semibold tracking-normal text-coral sm:text-xl">
              {formatKrw(cardExpenseTotal)}
            </p>
          </div>
          <CreditCard className="text-coral" size={22} aria-hidden="true" />
        </div>

        {summary.cardExpenses.length > 0 ? (
          <div className="mt-3 grid min-w-0 gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {summary.cardExpenses.map((item) => (
              <div
                key={item.label}
                className="flex min-w-0 items-center justify-between gap-3 rounded-md bg-field px-2 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink">{item.label}</p>
                  <p className="text-xs text-muted">{item.transactionCount}건</p>
                </div>
                <p className="shrink-0 text-sm font-semibold text-coral">{formatKrw(item.amount)}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 rounded-md border border-dashed border-line px-3 py-4 text-center text-sm text-muted">
            카드 지출 데이터 없음.
          </p>
        )}
      </article>
    </section>
  );
}
