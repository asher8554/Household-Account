// 연도별 월간 소비 추세를 차트와 목록으로 보여줍니다.
import { useMemo, useState } from "react";
import {
  ArrowDownRight,
  CalendarRange,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
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
import { listCategories } from "../categories/category-service";
import { listTransactions } from "../transactions/transaction-service";
import type { Transaction } from "../transactions/transaction-types";
import {
  buildAnnualCategoryTrends,
  buildAnnualMonthTrends,
  getAnnualTrendSummary,
  type AnnualCategoryTrendResult,
  type AnnualTrendSummary,
} from "./annual-trend-calculations";

const initialData = {
  categories: [],
  transactions: [],
};

const DEFAULT_CATEGORY_TREND_LIMIT = 8;
const MIN_CATEGORY_TREND_LIMIT = 1;

export function AnnualTrendScreen() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [categoryTrendLimit, setCategoryTrendLimit] = useState(DEFAULT_CATEGORY_TREND_LIMIT);
  const { data, error, isLoading } = useLiveQuery(
    async () => ({
      categories: await listCategories(),
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
  const maxCategoryTrendLimit = useMemo(
    () => getAnnualExpenseCategoryCount(data.transactions, year),
    [data.transactions, year],
  );
  const effectiveCategoryTrendLimit = Math.min(
    Math.max(MIN_CATEGORY_TREND_LIMIT, categoryTrendLimit),
    Math.max(MIN_CATEGORY_TREND_LIMIT, maxCategoryTrendLimit),
  );
  const categoryTrends = useMemo(
    () => buildAnnualCategoryTrends(data.transactions, data.categories, year, effectiveCategoryTrendLimit),
    [data.transactions, data.categories, year, effectiveCategoryTrendLimit],
  );

  function decreaseCategoryTrendLimit() {
    setCategoryTrendLimit((value) => {
      const cappedValue = Math.min(value, Math.max(MIN_CATEGORY_TREND_LIMIT, maxCategoryTrendLimit));
      return Math.max(MIN_CATEGORY_TREND_LIMIT, cappedValue - 1);
    });
  }

  function increaseCategoryTrendLimit() {
    setCategoryTrendLimit((value) => {
      const cappedMax = Math.max(MIN_CATEGORY_TREND_LIMIT, maxCategoryTrendLimit);
      return Math.min(cappedMax, Math.max(MIN_CATEGORY_TREND_LIMIT, value) + 1);
    });
  }

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

      <CategoryTrendSection
        trend={categoryTrends}
        year={year}
        categoryLimit={effectiveCategoryTrendLimit}
        maxCategoryLimit={maxCategoryTrendLimit}
        onDecreaseCategoryLimit={decreaseCategoryTrendLimit}
        onIncreaseCategoryLimit={increaseCategoryTrendLimit}
      />

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

type CategoryTrendSectionProps = {
  trend: AnnualCategoryTrendResult;
  year: number;
  categoryLimit: number;
  maxCategoryLimit: number;
  onDecreaseCategoryLimit: () => void;
  onIncreaseCategoryLimit: () => void;
};

function CategoryTrendSection({
  trend,
  year,
  categoryLimit,
  maxCategoryLimit,
  onDecreaseCategoryLimit,
  onIncreaseCategoryLimit,
}: CategoryTrendSectionProps) {
  const categoryNameMap = useMemo(
    () => new Map(trend.categories.map((category) => [category.categoryId, category.name])),
    [trend.categories],
  );
  const hasTrendData = trend.totalExpense > 0;
  const displayLimit = hasTrendData ? categoryLimit : 0;
  const canDecreaseLimit = hasTrendData && categoryLimit > MIN_CATEGORY_TREND_LIMIT;
  const canIncreaseLimit = hasTrendData && categoryLimit < maxCategoryLimit;

  return (
    <SectionPanel
      title="카테고리별 소비 변화"
      eyebrow={`${year}년 상위 카테고리`}
      action={
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex h-8 items-center rounded-lg border border-line bg-field px-3 text-xs font-medium text-muted">
            상위 {displayLimit}개
          </span>
          <Button
            size="sm"
            variant="secondary"
            onClick={onDecreaseCategoryLimit}
            disabled={!canDecreaseLimit}
            aria-label="표시 개수 줄이기"
            title="표시 개수 줄이기"
          >
            <ChevronDown size={16} aria-hidden="true" />
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={onIncreaseCategoryLimit}
            disabled={!canIncreaseLimit}
            aria-label="표시 개수 늘리기"
            title="표시 개수 늘리기"
          >
            <ChevronUp size={16} aria-hidden="true" />
          </Button>
        </div>
      }
    >
      {trend.totalExpense === 0 ? (
        <p className="rounded-lg border border-dashed border-line px-3 py-10 text-center text-sm text-muted">
          카테고리별 지출 데이터 없음.
        </p>
      ) : (
        <div className="grid gap-4">
          <div className="h-[360px] min-w-0">
            <ResponsiveContainer
              width="100%"
              height="100%"
              minWidth={240}
              minHeight={300}
              initialDimension={{ width: 720, height: 360 }}
            >
              <BarChart data={trend.months} margin={{ top: 12, right: 12, bottom: 16, left: 0 }}>
                <CartesianGrid stroke="rgb(var(--color-line))" strokeDasharray="4 4" vertical={false} />
                <XAxis
                  dataKey="label"
                  tickMargin={8}
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
                    categoryNameMap.get(String(name)) ?? String(name),
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
                {trend.categories.map((category) => (
                  <Bar
                    key={category.categoryId}
                    dataKey={category.categoryId}
                    stackId="expense"
                    name={category.name}
                    fill={category.color}
                    isAnimationActive={false}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
          <CategoryTrendLegend categories={trend.categories} />

          <div className="grid gap-2 lg:grid-cols-2">
            {trend.categories.map((category) => (
              <article
                key={category.categoryId}
                className="grid gap-3 rounded-lg border border-line bg-surface px-3 py-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: category.color }}
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-ink">{category.name}</p>
                      <p className="text-xs text-muted">연간 {category.share.toFixed(1)}%</p>
                    </div>
                  </div>
                  <p className="shrink-0 text-sm font-semibold text-coral">{formatKrw(category.totalExpense)}</p>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-field">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${category.share}%`, backgroundColor: category.color }}
                  />
                </div>
                <div className="grid gap-2 text-sm text-muted sm:grid-cols-2">
                  <p>
                    최고 지출월{" "}
                    <span className="font-semibold text-ink">
                      {category.peakMonthLabel}
                    </span>
                  </p>
                  <p>
                    {formatRecentWindowLabel(trend)}{" "}
                    <span className={getDeltaClassName(category.recentDelta)}>
                      {formatCategoryDelta(category.recentDelta)}
                    </span>
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}
    </SectionPanel>
  );
}

function CategoryTrendLegend({ categories }: { categories: AnnualCategoryTrendResult["categories"] }) {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 px-1 text-xs text-muted" aria-label="카테고리 범례">
      {categories.map((category) => (
        <span key={category.categoryId} className="inline-flex min-w-0 items-center gap-1.5">
          <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: category.color }} />
          <span className="max-w-24 truncate">{category.name}</span>
        </span>
      ))}
    </div>
  );
}

function getAnnualExpenseCategoryCount(transactions: Transaction[], year: number) {
  return new Set(
    transactions
      .filter((transaction) => transaction.type === "expense" && transaction.date.startsWith(`${year}-`))
      .map((transaction) => transaction.categoryId),
  ).size;
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

function formatExpenseDelta(delta: number | null) {
  if (delta === null) return "전월 없음";
  if (delta === 0) return "전월 동일";
  const direction = delta > 0 ? "증가" : "감소";
  return `${formatKrw(Math.abs(delta))} ${direction}`;
}

function formatRecentWindowLabel(trend: AnnualCategoryTrendResult) {
  if (!trend.previousWindowLabel) return trend.recentWindowLabel;
  return `${trend.previousWindowLabel} 대비 ${trend.recentWindowLabel}`;
}

function formatCategoryDelta(delta: number | null) {
  if (delta === null) return "비교 없음";
  if (delta === 0) return "동일";
  const direction = delta > 0 ? "증가" : "감소";
  return `${formatKrw(Math.abs(delta))} ${direction}`;
}

function getDeltaClassName(delta: number | null) {
  if (delta === null || delta === 0) return "font-semibold text-muted";
  return delta > 0 ? "font-semibold text-coral" : "font-semibold text-mint";
}
