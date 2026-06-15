// 월간 수입, 지출, 순액, 일평균 지출과 카드별 사용금액을 요약합니다.
import { ArrowDownRight, ArrowUpRight, CreditCard, ReceiptText, WalletCards } from "lucide-react";
import { cx } from "../../lib/cx";
import { formatKrw, formatSignedKrw } from "../../lib/money";
import { Button } from "../../shared/ui/Button";
import type { CardCompanyId, CardExpenseStat, MonthSummary } from "./dashboard-calculations";

type MonthSummaryCardsProps = {
  summary: MonthSummary;
  cardExpenseStats?: CardExpenseStat[];
  selectedCardCompanyIds?: CardCompanyId[];
  onToggleCardCompany?: (cardCompanyId: CardCompanyId) => void;
};

export function MonthSummaryCards({
  summary,
  cardExpenseStats,
  selectedCardCompanyIds,
  onToggleCardCompany,
}: MonthSummaryCardsProps) {
  const cardExpenseTotal = summary.cardExpenses.reduce((sum, item) => sum + item.amount, 0);
  const cardExpenseItems = cardExpenseStats ?? summary.cardExpenses;
  const selectedCardCompanyIdSet = new Set(selectedCardCompanyIds ?? cardExpenseItems.map((item) => item.id));
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

        {cardExpenseItems.length > 0 ? (
          <div className="mt-3 grid min-w-0 gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {cardExpenseItems.map((item) => {
              const isSelected = selectedCardCompanyIdSet.has(item.id);

              return (
                <Button
                  key={item.id}
                  variant={isSelected ? "primary" : "secondary"}
                  className={cx(
                    "h-auto min-h-14 w-full justify-between px-2 py-2 text-left",
                    !isSelected && "opacity-70",
                  )}
                  aria-pressed={isSelected}
                  onClick={() => onToggleCardCompany?.(item.id)}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{item.label}</span>
                    <span className={cx("block text-xs", isSelected ? "text-white/80" : "text-muted")}>
                      {item.transactionCount}건
                    </span>
                  </span>
                  <span className={cx("shrink-0 text-sm font-semibold", isSelected ? "text-white" : "text-coral")}>
                    {formatKrw(item.amount)}
                  </span>
                </Button>
              );
            })}
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
