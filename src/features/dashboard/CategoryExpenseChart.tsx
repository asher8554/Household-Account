// 월간 카테고리별 지출 차트를 표시합니다.
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { formatMonthTitle } from "../../lib/date";
import { formatKrw } from "../../lib/money";
import { cx } from "../../lib/cx";
import { Button } from "../../shared/ui/Button";
import { SectionPanel } from "../../shared/ui/SectionPanel";
import type { Category } from "../categories/category-types";
import type { Transaction } from "../transactions/transaction-types";
import type { CategoryExpenseStat } from "./dashboard-calculations";
import { TransactionList } from "./TransactionList";

type CategoryExpenseChartProps = {
  monthDate: Date;
  stats: CategoryExpenseStat[];
  transactions: Transaction[];
  categories: Category[];
  className?: string;
  onPreviousMonth: () => void;
  onCurrentMonth: () => void;
  onNextMonth: () => void;
  onDeleteTransaction: (id: string) => void;
  onChangeTransactionCategory: (id: string, categoryId: string) => void;
  onChangeSingleTransactionCategory: (id: string, categoryId: string) => void;
  onChangeTransactionAnnualTrendExclusion: (id: string, excludeFromAnnualTrend: boolean) => void;
};

type ChartClickPayload = {
  payload?: CategoryExpenseStat;
};

export function CategoryExpenseChart({
  monthDate,
  stats,
  transactions,
  categories,
  className,
  onPreviousMonth,
  onCurrentMonth,
  onNextMonth,
  onDeleteTransaction,
  onChangeTransactionCategory,
  onChangeSingleTransactionCategory,
  onChangeTransactionAnnualTrendExclusion,
}: CategoryExpenseChartProps) {
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const chartData = useMemo(() => stats, [stats]);
  const totalExpense = useMemo(
    () => chartData.reduce((sum, stat) => sum + stat.amount, 0),
    [chartData],
  );
  const selectedCategory = useMemo(() => {
    const stat = chartData.find((item) => item.categoryId === selectedCategoryId);

    if (stat || !selectedCategoryId) return stat;

    // 월이 바뀌어 거래가 없어도 상세 영역 높이가 유지되도록 카테고리 정보로 대체합니다.
    const meta = categories.find((category) => category.id === selectedCategoryId);
    return meta ? { categoryId: meta.id, name: meta.name, color: meta.color, amount: 0 } : undefined;
  }, [chartData, categories, selectedCategoryId]);
  const selectedTransactions = useMemo(
    () =>
      transactions
        .filter((transaction) => transaction.type === "expense" && transaction.categoryId === selectedCategoryId)
        .sort(
          (a, b) =>
            b.date.localeCompare(a.date) ||
            b.updatedAt.localeCompare(a.updatedAt) ||
            b.id.localeCompare(a.id),
        ),
    [transactions, selectedCategoryId],
  );

  function handleChartClick(data: ChartClickPayload) {
    if (!data.payload?.categoryId) return;
    setSelectedCategoryId(data.payload.categoryId);
  }

  function getShare(amount: number) {
    if (totalExpense <= 0) return "0.0%";
    return `${((amount / totalExpense) * 100).toFixed(1)}%`;
  }

  return (
    <SectionPanel
      title="카테고리별 지출"
      eyebrow={formatMonthTitle(monthDate)}
      className={cx("flex flex-col", className)}
      bodyClassName="flex min-h-0 flex-1 flex-col"
      action={
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="secondary" onClick={onPreviousMonth} aria-label="이전 달" title="이전 달">
            <ChevronLeft size={17} aria-hidden="true" />
          </Button>
          <Button size="sm" variant="secondary" onClick={onCurrentMonth}>
            <RotateCcw size={15} aria-hidden="true" />
            이번 달
          </Button>
          <Button size="sm" variant="secondary" onClick={onNextMonth} aria-label="다음 달" title="다음 달">
            <ChevronRight size={17} aria-hidden="true" />
          </Button>
        </div>
      }
    >
      {chartData.length === 0 ? (
        <p className="m-auto rounded-lg border border-dashed border-line px-3 py-8 text-center text-sm text-muted">
          지출 데이터 없음.
        </p>
      ) : (
        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4">
          <div className="grid min-h-0 min-w-0 flex-1 gap-4 lg:grid-cols-[minmax(13rem,0.85fr)_minmax(0,1fr)]">
            <div className="relative h-full min-h-[220px] min-w-0">
              <ResponsiveContainer
                width="100%"
                height="100%"
                minWidth={0}
                minHeight={200}
                initialDimension={{ width: 260, height: 220 }}
              >
                <PieChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                  <Tooltip
                    formatter={(value) => formatKrw(Number(value))}
                    contentStyle={{
                      backgroundColor: "rgb(var(--color-panel) / 0.82)",
                      backdropFilter: "blur(16px) saturate(165%)",
                      WebkitBackdropFilter: "blur(16px) saturate(165%)",
                      border: "1px solid rgb(var(--hairline-rgb) / 0.25)",
                      borderRadius: 12,
                      color: "rgb(var(--color-ink))",
                      boxShadow: "0 18px 36px -12px rgba(24, 54, 39, 0.28)",
                    }}
                    labelStyle={{ color: "rgb(var(--color-muted))" }}
                  />
                  <Pie
                    data={chartData}
                    dataKey="amount"
                    nameKey="name"
                    innerRadius="58%"
                    outerRadius="86%"
                    paddingAngle={2}
                    stroke="rgb(var(--color-panel))"
                    strokeWidth={2}
                    isAnimationActive={false}
                    onClick={(data) => handleChartClick(data as ChartClickPayload)}
                  >
                    {chartData.map((entry) => (
                      <Cell
                        key={entry.categoryId}
                        fill={entry.color}
                        onClick={() => setSelectedCategoryId(entry.categoryId)}
                        opacity={!selectedCategoryId || selectedCategoryId === entry.categoryId ? 1 : 0.48}
                        stroke={selectedCategoryId === entry.categoryId ? "rgb(var(--color-ink))" : "rgb(var(--color-panel))"}
                        strokeWidth={selectedCategoryId === entry.categoryId ? 3 : 2}
                        cursor="pointer"
                      />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-xs text-muted">총 지출</span>
                <span className="mt-1 text-lg font-bold text-coral sm:text-xl">{formatKrw(totalExpense)}</span>
              </div>
            </div>

            <div className="flex min-w-0 flex-col justify-center gap-2">
              <div className="flex shrink-0 items-end justify-between gap-3 border-b border-line pb-2">
                <div className="min-w-0">
                  <p className="text-xs text-muted">이번 달 사용한 총금액</p>
                  <p className="break-words text-base font-bold text-coral sm:text-lg">{formatKrw(totalExpense)}</p>
                </div>
                <p className="text-xs text-muted">{chartData.length}개 카테고리</p>
              </div>
              <div className="grid min-h-0 min-w-0 max-h-72 gap-1 overflow-auto pr-1">
                {chartData.map((entry) => {
                  const isSelected = selectedCategoryId === entry.categoryId;

                  return (
                    <button
                      key={entry.categoryId}
                      type="button"
                      className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-md px-2 py-2 text-left transition-colors ${
                        isSelected ? "bg-moss-soft" : "hover:bg-field"
                      }`}
                      onClick={() => setSelectedCategoryId(entry.categoryId)}
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: entry.color }}
                        />
                        <span className="truncate text-sm font-medium text-ink">{entry.name}</span>
                      </span>
                      <span className="text-right">
                        <span className="block text-sm font-semibold text-ink">{formatKrw(entry.amount)}</span>
                        <span className="block text-xs text-muted">{getShare(entry.amount)}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {selectedCategory ? (
            <div className="border-t border-line pt-3">
              <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: selectedCategory.color }}
                  />
                  <span className="truncate font-semibold text-ink">{selectedCategory.name} 상세</span>
                </div>
                <span className="shrink-0 font-semibold text-coral">{formatKrw(selectedCategory.amount)}</span>
              </div>
              <TransactionList
                transactions={selectedTransactions}
                categories={categories}
                emptyMessage="거래 없음."
                showDate
                onDeleteTransaction={onDeleteTransaction}
                onChangeTransactionCategory={onChangeTransactionCategory}
                onChangeSingleTransactionCategory={onChangeSingleTransactionCategory}
                onChangeTransactionAnnualTrendExclusion={onChangeTransactionAnnualTrendExclusion}
              />
            </div>
          ) : null}
        </div>
      )}
    </SectionPanel>
  );
}
