// 월간 카테고리별 지출 차트를 표시합니다.
import { useEffect, useMemo, useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { formatKrw } from "../../lib/money";
import { SectionPanel } from "../../shared/ui/SectionPanel";
import type { Category } from "../categories/category-types";
import type { Transaction } from "../transactions/transaction-types";
import type { CategoryExpenseStat } from "./dashboard-calculations";
import { TransactionList } from "./TransactionList";

type CategoryExpenseChartProps = {
  stats: CategoryExpenseStat[];
  transactions: Transaction[];
  categories: Category[];
  onDeleteTransaction: (id: string) => void;
  onChangeTransactionCategory: (id: string, categoryId: string) => void;
};

type ChartClickPayload = {
  payload?: CategoryExpenseStat;
};

export function CategoryExpenseChart({
  stats,
  transactions,
  categories,
  onDeleteTransaction,
  onChangeTransactionCategory,
}: CategoryExpenseChartProps) {
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const chartData = useMemo(() => stats, [stats]);
  const totalExpense = useMemo(
    () => chartData.reduce((sum, stat) => sum + stat.amount, 0),
    [chartData],
  );
  const selectedCategory = chartData.find((stat) => stat.categoryId === selectedCategoryId);
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

  useEffect(() => {
    if (!selectedCategoryId) return;
    if (chartData.some((stat) => stat.categoryId === selectedCategoryId)) return;
    setSelectedCategoryId("");
  }, [chartData, selectedCategoryId]);

  function handleChartClick(data: ChartClickPayload) {
    if (!data.payload?.categoryId) return;
    setSelectedCategoryId(data.payload.categoryId);
  }

  function getShare(amount: number) {
    if (totalExpense <= 0) return "0.0%";
    return `${((amount / totalExpense) * 100).toFixed(1)}%`;
  }

  return (
    <SectionPanel title="카테고리별 지출" eyebrow="이번 달">
      {chartData.length === 0 ? (
        <p className="rounded-lg border border-dashed border-line px-3 py-8 text-center text-sm text-muted">
          지출 데이터 없음.
        </p>
      ) : (
        <div className="grid gap-4">
          <div className="grid gap-4 lg:grid-cols-[minmax(15rem,0.85fr)_minmax(0,1fr)]">
            <div className="relative h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                  <Tooltip
                    formatter={(value) => formatKrw(Number(value))}
                    contentStyle={{
                      backgroundColor: "rgb(var(--color-panel))",
                      border: "1px solid rgb(var(--color-line))",
                      borderRadius: 8,
                      color: "rgb(var(--color-ink))",
                      boxShadow: "0 10px 24px rgba(32,35,31,0.08)",
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
                <span className="mt-1 text-xl font-bold text-coral">{formatKrw(totalExpense)}</span>
              </div>
            </div>

            <div className="grid content-center gap-2">
              <div className="flex items-end justify-between gap-3 border-b border-line pb-2">
                <div>
                  <p className="text-xs text-muted">이번 달 사용한 총금액</p>
                  <p className="text-lg font-bold text-coral">{formatKrw(totalExpense)}</p>
                </div>
                <p className="text-xs text-muted">{chartData.length}개 카테고리</p>
              </div>
              <div className="grid max-h-72 gap-1 overflow-auto pr-1">
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
              />
            </div>
          ) : null}
        </div>
      )}
    </SectionPanel>
  );
}
