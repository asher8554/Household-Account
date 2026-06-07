// 월간 달력 그리드와 날짜별 지출 강도 표시를 담당합니다.
import { ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import { cx } from "../../lib/cx";
import { formatCompactKrw } from "../../lib/money";
import { formatMonthTitle, getMonthGridDays, weekdayLabels } from "../../lib/date";
import { Button } from "../../shared/ui/Button";
import type { Category } from "../categories/category-types";
import type { DailySummary } from "./dashboard-calculations";

type CalendarGridProps = {
  monthDate: Date;
  selectedDateKey: string;
  dailySummaries: Map<string, DailySummary>;
  maxDailyExpense: number;
  categories: Category[];
  onSelectDate: (dateKey: string, date: Date) => void;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  onCurrentMonth: () => void;
};

function intensityClass(expense: number, maxDailyExpense: number) {
  if (expense <= 0 || maxDailyExpense <= 0) return "bg-expense-0";

  const ratio = expense / maxDailyExpense;

  if (ratio <= 0.25) return "bg-expense-1";
  if (ratio <= 0.5) return "bg-expense-2";
  if (ratio <= 0.75) return "bg-expense-3";
  return "bg-expense-4";
}

export function CalendarGrid({
  monthDate,
  selectedDateKey,
  dailySummaries,
  maxDailyExpense,
  categories,
  onSelectDate,
  onPreviousMonth,
  onNextMonth,
  onCurrentMonth,
}: CalendarGridProps) {
  const days = getMonthGridDays(monthDate);
  const categoryMap = new Map(categories.map((category) => [category.id, category]));

  return (
    <section className="min-w-0 overflow-hidden rounded-lg border border-line bg-panel shadow-panel">
      <div className="flex flex-col gap-3 border-b border-line px-3 py-3 md:flex-row md:items-center md:justify-between md:px-4">
        <div className="min-w-0">
          <p className="text-sm text-muted">월간 달력</p>
          <h2 className="text-xl font-semibold tracking-normal sm:text-2xl">{formatMonthTitle(monthDate)}</h2>
        </div>
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
      </div>

      <div className="grid min-w-0 grid-cols-7 border-b border-line bg-moss-soft text-center text-xs font-semibold text-moss">
        {weekdayLabels.map((label) => (
          <div key={label} className="py-2">
            {label}
          </div>
        ))}
      </div>

      <div className="grid min-w-0 grid-cols-7">
        {days.map((day, index) => {
          const summary = dailySummaries.get(day.dateKey);
          const topCategory = summary?.topExpenseCategoryId
            ? categoryMap.get(summary.topExpenseCategoryId)
            : null;
          const isSelected = day.dateKey === selectedDateKey;

          return (
            <button
              key={day.dateKey}
              type="button"
              className={cx(
                "min-h-[76px] min-w-0 overflow-hidden border-b border-r border-line p-1.5 text-left transition hover:ring-2 hover:ring-mint/50 sm:min-h-[104px] sm:p-2 md:min-h-[132px]",
                intensityClass(summary?.expense ?? 0, maxDailyExpense),
                !day.isCurrentMonth && "opacity-45",
                isSelected && "ring-2 ring-mint",
                index % 7 === 6 && "border-r-0",
              )}
              onClick={() => onSelectDate(day.dateKey, day.date)}
            >
              <div className="flex items-center justify-between gap-1">
                <span
                  className={cx(
                    "flex h-6 min-w-5 items-center justify-center rounded-lg px-1 text-xs font-semibold sm:min-w-6 sm:text-sm",
                    day.isToday && "bg-mint text-white",
                  )}
                >
                  {day.dayNumber}
                </span>
                {summary?.income ? (
                  <span className="truncate text-xs font-medium text-mint">+{formatCompactKrw(summary.income)}</span>
                ) : null}
              </div>

              <div className="mt-2 grid min-w-0 gap-1 sm:mt-3">
                {summary?.expense ? (
                  <span className="truncate text-xs font-semibold text-coral sm:text-sm">
                    -{formatCompactKrw(summary.expense)}
                  </span>
                ) : (
                  <span className="text-xs text-muted">0</span>
                )}
                {topCategory ? (
                  <span className="flex min-w-0 items-center gap-1 text-xs text-ink">
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: topCategory.color }}
                    />
                    <span className="truncate">{topCategory.name}</span>
                  </span>
                ) : null}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
