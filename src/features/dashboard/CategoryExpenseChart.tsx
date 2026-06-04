// 월간 카테고리별 지출 차트를 표시합니다.
import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
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
  const chartData = useMemo(() => stats.slice(0, 8), [stats]);
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

  return (
    <SectionPanel title="카테고리별 지출" eyebrow="이번 달">
      {chartData.length === 0 ? (
        <p className="rounded-lg border border-dashed border-line px-3 py-8 text-center text-sm text-muted">
          지출 데이터 없음.
        </p>
      ) : (
        <div className="grid gap-4">
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ top: 8, right: 116, bottom: 8, left: 12 }}>
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={84}
                  tick={{ fontSize: 12, fill: "rgb(var(--color-muted))" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(value) => formatKrw(Number(value))}
                  cursor={{ fill: "rgb(var(--color-moss-soft))" }}
                  contentStyle={{
                    backgroundColor: "rgb(var(--color-panel))",
                    border: "1px solid rgb(var(--color-line))",
                    borderRadius: 8,
                    color: "rgb(var(--color-ink))",
                    boxShadow: "0 10px 24px rgba(32,35,31,0.08)",
                  }}
                  labelStyle={{ color: "rgb(var(--color-muted))" }}
                />
                <Bar
                  dataKey="amount"
                  radius={[0, 6, 6, 0]}
                  barSize={18}
                  onClick={(data) => handleChartClick(data as ChartClickPayload)}
                >
                  <LabelList
                    dataKey="amount"
                    position="right"
                    formatter={(value) => formatKrw(Number(value ?? 0))}
                    fill="rgb(var(--color-ink))"
                    fontSize={12}
                    fontWeight={600}
                  />
                  {chartData.map((entry) => (
                    <Cell
                      key={entry.categoryId}
                      fill={entry.color}
                      onClick={() => setSelectedCategoryId(entry.categoryId)}
                      opacity={!selectedCategoryId || selectedCategoryId === entry.categoryId ? 1 : 0.58}
                      stroke={selectedCategoryId === entry.categoryId ? "rgb(var(--color-ink))" : entry.color}
                      strokeWidth={selectedCategoryId === entry.categoryId ? 2 : 0}
                      cursor="pointer"
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
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
