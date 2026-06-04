// 연도별 월간 소비 추세를 차트와 목록으로 보여줍니다.
import { useMemo, useState } from "react";
import {
  ArrowDownRight,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  ReceiptText,
  RotateCcw,
  TrendingUp,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useLiveQuery } from "../../db/use-live-query";
import { formatCompactKrw, formatKrw, formatSignedKrw } from "../../lib/money";
import { Button } from "../../shared/ui/Button";
import { SectionPanel } from "../../shared/ui/SectionPanel";
import { listTransactions } from "../transactions/transaction-service";
import type { Transaction } from "../transactions/transaction-types";

type AnnualTrendMonth = {
  month: number;
  label: string;
  income: number;
  expense: number;
  net: number;
  transactionCount: number;
  expenseDelta: number | null;
  maxExpenseShare: number;
};

type AnnualTrendSummary = {
  totalIncome: number;
  totalExpense: number;
  net: number;
  monthlyAverageExpense: number;
  expenseMonths: number;
  transactionCount: number;
  peakMonth: AnnualTrendMonth | null;
};

const initialData = {
  transactions: [],
};

export function AnnualTrendScreen() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const { data, error, isLoading } = useLiveQuery(
    async () => ({
      transactions: await listTransactions(),
    }),
    [],
    initialData,
  );
  const monthlyTrends = useMemo(
    () => buildAnnualMonthTrends(data.transactions, year),
    [data.transactions, year],
  );
  const summary = useMemo(() => getAnnualTrendSummary(monthlyTrends), [monthlyTrends]);

  if (error) {
    return (
      <SectionPanel title="오류">
        <p className="text-sm text-coral">로컬 데이터베이스를 읽지 못했습니다.</p>
      </SectionPanel>
    );
  }

  return (
    <div className="grid gap-5">
      <AnnualTrendSummaryCards summary={summary} />

      <SectionPanel
        title="월별 소비 추세"
        eyebrow={isLoading ? "로딩" : `${year}년`}
        action={
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setYear((value) => value - 1)}
              aria-label="이전 연도"
              title="이전 연도"
            >
              <ChevronLeft size={17} aria-hidden="true" />
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setYear(currentYear)}>
              <RotateCcw size={15} aria-hidden="true" />
              올해
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setYear((value) => value + 1)}
              aria-label="다음 연도"
              title="다음 연도"
            >
              <ChevronRight size={17} aria-hidden="true" />
            </Button>
          </div>
        }
      >
        {summary.totalExpense === 0 ? (
          <p className="rounded-lg border border-dashed border-line px-3 py-12 text-center text-sm text-muted">
            지출 데이터 없음.
          </p>
        ) : (
          <div className="h-[360px] min-w-0">
            <ResponsiveContainer
              width="100%"
              height="100%"
              minWidth={240}
              minHeight={300}
              initialDimension={{ width: 720, height: 360 }}
            >
              <BarChart data={monthlyTrends} margin={{ top: 12, right: 12, bottom: 0, left: 0 }}>
                <CartesianGrid stroke="rgb(var(--color-line))" strokeDasharray="4 4" vertical={false} />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "rgb(var(--color-muted))", fontSize: 12 }}
                />
                <YAxis
                  width={56}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => formatCompactKrw(Number(value))}
                  tick={{ fill: "rgb(var(--color-muted))", fontSize: 12 }}
                />
                <Tooltip
                  formatter={(value, name) => [
                    formatKrw(Number(value)),
                    name === "expense" ? "지출" : "수입",
                  ]}
                  labelFormatter={(label) => `${year}년 ${label}`}
                  contentStyle={{
                    backgroundColor: "rgb(var(--color-panel))",
                    border: "1px solid rgb(var(--color-line))",
                    borderRadius: 8,
                    color: "rgb(var(--color-ink))",
                    boxShadow: "0 10px 24px rgba(32,35,31,0.08)",
                  }}
                  labelStyle={{ color: "rgb(var(--color-muted))" }}
                />
                <ReferenceLine
                  y={summary.monthlyAverageExpense}
                  stroke="rgb(var(--color-mint))"
                  strokeDasharray="5 5"
                />
                <Bar
                  dataKey="expense"
                  name="지출"
                  fill="rgb(var(--color-coral))"
                  radius={[6, 6, 0, 0]}
                  isAnimationActive={false}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </SectionPanel>

      <SectionPanel title="월별 상세" eyebrow={`${summary.expenseMonths}개월 소비 기록`}>
        <div className="grid gap-2">
          {monthlyTrends.map((month) => (
            <article
              key={month.month}
              className="grid gap-3 rounded-lg border border-line bg-surface px-3 py-3 md:grid-cols-[5rem_minmax(0,1fr)_12rem_12rem] md:items-center"
            >
              <div className="flex items-center justify-between gap-3 md:block">
                <p className="text-sm font-semibold text-ink">{month.label}</p>
                <p className="text-xs text-muted md:mt-1">{month.transactionCount}건</p>
              </div>
              <div className="min-w-0">
                <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                  <span className="font-medium text-coral">{formatKrw(month.expense)}</span>
                  <span className={month.expenseDelta && month.expenseDelta > 0 ? "text-coral" : "text-mint"}>
                    {formatExpenseDelta(month.expenseDelta)}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-field">
                  <div
                    className="h-full rounded-full bg-coral"
                    style={{ width: `${month.maxExpenseShare}%` }}
                  />
                </div>
              </div>
              <p className="text-sm text-muted">
                수입 <span className="font-semibold text-mint">{formatKrw(month.income)}</span>
              </p>
              <p className="text-sm text-muted">
                순액{" "}
                <span className={month.net >= 0 ? "font-semibold text-mint" : "font-semibold text-coral"}>
                  {formatSignedKrw(month.net)}
                </span>
              </p>
            </article>
          ))}
        </div>
      </SectionPanel>
    </div>
  );
}

function AnnualTrendSummaryCards({ summary }: { summary: AnnualTrendSummary }) {
  const items = [
    {
      label: "연간 지출",
      value: formatKrw(summary.totalExpense),
      icon: ArrowDownRight,
      tone: "text-coral",
    },
    {
      label: "소비 월평균",
      value: formatKrw(summary.monthlyAverageExpense),
      icon: ReceiptText,
      tone: "text-honey",
    },
    {
      label: "최고 지출월",
      value: summary.peakMonth ? `${summary.peakMonth.label} ${formatKrw(summary.peakMonth.expense)}` : "없음",
      icon: TrendingUp,
      tone: "text-mint",
    },
    {
      label: "연간 순액",
      value: formatSignedKrw(summary.net),
      icon: CalendarRange,
      tone: summary.net >= 0 ? "text-mint" : "text-coral",
    },
  ];

  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => {
        const Icon = item.icon;

        return (
          <article key={item.label} className="rounded-lg border border-line bg-panel px-4 py-3 shadow-panel">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm text-muted">{item.label}</p>
                <p className="mt-1 break-words text-xl font-semibold tracking-normal">{item.value}</p>
              </div>
              <Icon className={item.tone} size={22} aria-hidden="true" />
            </div>
          </article>
        );
      })}
    </section>
  );
}

function buildAnnualMonthTrends(transactions: Transaction[], year: number): AnnualTrendMonth[] {
  const months: AnnualTrendMonth[] = Array.from({ length: 12 }, (_, index) => ({
    month: index + 1,
    label: `${index + 1}월`,
    income: 0,
    expense: 0,
    net: 0,
    transactionCount: 0,
    expenseDelta: null,
    maxExpenseShare: 0,
  }));

  for (const transaction of transactions) {
    if (!transaction.date.startsWith(`${year}-`)) continue;

    const monthIndex = Number(transaction.date.slice(5, 7)) - 1;
    const month = months[monthIndex];
    if (!month) continue;

    month.transactionCount += 1;

    if (transaction.type === "income") {
      month.income += transaction.amount;
    } else {
      month.expense += transaction.amount;
    }
  }

  const maxExpense = Math.max(0, ...months.map((month) => month.expense));

  return months.map((month, index) => {
    const previous = index > 0 ? months[index - 1] : null;
    const net = month.income - month.expense;

    return {
      ...month,
      net,
      expenseDelta: previous ? month.expense - previous.expense : null,
      maxExpenseShare: maxExpense > 0 ? Math.round((month.expense / maxExpense) * 100) : 0,
    };
  });
}

function getAnnualTrendSummary(months: AnnualTrendMonth[]): AnnualTrendSummary {
  const totalIncome = months.reduce((sum, month) => sum + month.income, 0);
  const totalExpense = months.reduce((sum, month) => sum + month.expense, 0);
  const expenseMonths = months.filter((month) => month.expense > 0).length;
  const peakMonth = months.reduce<AnnualTrendMonth | null>(
    (currentPeak, month) => (month.expense > (currentPeak?.expense ?? 0) ? month : currentPeak),
    null,
  );

  return {
    totalIncome,
    totalExpense,
    net: totalIncome - totalExpense,
    monthlyAverageExpense: expenseMonths > 0 ? Math.round(totalExpense / expenseMonths) : 0,
    expenseMonths,
    transactionCount: months.reduce((sum, month) => sum + month.transactionCount, 0),
    peakMonth: peakMonth && peakMonth.expense > 0 ? peakMonth : null,
  };
}

function formatExpenseDelta(delta: number | null) {
  if (delta === null) return "전월 없음";
  if (delta === 0) return "전월 동일";
  const direction = delta > 0 ? "증가" : "감소";
  return `${formatKrw(Math.abs(delta))} ${direction}`;
}
