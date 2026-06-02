// 월간 카테고리별 지출 차트를 표시합니다.
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatKrw } from "../../lib/money";
import { SectionPanel } from "../../shared/ui/SectionPanel";
import type { CategoryExpenseStat } from "./dashboard-calculations";

type CategoryExpenseChartProps = {
  stats: CategoryExpenseStat[];
};

export function CategoryExpenseChart({ stats }: CategoryExpenseChartProps) {
  const chartData = stats.slice(0, 8);

  return (
    <SectionPanel title="카테고리별 지출" eyebrow="이번 달">
      {chartData.length === 0 ? (
        <p className="rounded-lg border border-dashed border-line px-3 py-8 text-center text-sm text-muted">
          지출 데이터 없음.
        </p>
      ) : (
        <div className="h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ top: 8, right: 24, bottom: 8, left: 12 }}>
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
              <Bar dataKey="amount" radius={[0, 6, 6, 0]} barSize={18}>
                {chartData.map((entry) => (
                  <Cell key={entry.categoryId} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </SectionPanel>
  );
}
