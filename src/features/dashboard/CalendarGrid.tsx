// 월간 달력 그리드와 날짜별 지출 강도 표시를 담당합니다.
import { useEffect, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
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
  onSelectMonth: (monthDate: Date) => void;
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
  onSelectMonth,
}: CalendarGridProps) {
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(() => monthDate.getFullYear());
  const days = getMonthGridDays(monthDate);
  const categoryMap = new Map(categories.map((category) => [category.id, category]));

  useEffect(() => {
    if (!isMonthPickerOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setIsMonthPickerOpen(false);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isMonthPickerOpen]);

  function toggleMonthPicker() {
    setIsMonthPickerOpen((open) => {
      if (!open) setPickerYear(monthDate.getFullYear());
      return !open;
    });
  }

  function selectMonth(month: number) {
    onSelectMonth(new Date(pickerYear, month, 1));
    setIsMonthPickerOpen(false);
  }

  return (
    <section className="min-w-0 overflow-hidden rounded-lg border border-line bg-panel shadow-panel">
      <div className="relative flex flex-col gap-3 border-b border-line px-3 py-3 md:flex-row md:items-center md:justify-between md:px-4">
        <div className="min-w-0">
          <p className="text-sm text-muted">월간 달력</p>
          <button
            type="button"
            className="group flex max-w-full items-center gap-1.5 rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint"
            onClick={toggleMonthPicker}
            aria-expanded={isMonthPickerOpen}
            aria-haspopup="dialog"
            aria-label={`${formatMonthTitle(monthDate)} 연도·월 선택`}
            title="클릭해서 연도와 월 선택"
          >
            <span className="truncate text-xl font-semibold tracking-normal group-hover:text-mint sm:text-2xl">
              {formatMonthTitle(monthDate)}
            </span>
            <ChevronDown
              size={18}
              aria-hidden="true"
              className={cx("shrink-0 text-muted transition-transform", isMonthPickerOpen && "rotate-180")}
            />
          </button>
          {isMonthPickerOpen ? (
            <>
              <div aria-hidden="true" className="fixed inset-0 z-30" onClick={() => setIsMonthPickerOpen(false)} />
              <div
                role="dialog"
                aria-label="연도·월 선택"
                className="absolute left-3 top-full z-40 mt-2 w-64 rounded-lg border border-line bg-panel p-3 shadow-panel md:left-4"
              >
                <div className="flex items-center justify-between gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setPickerYear((year) => year - 1)}
                    aria-label="이전 연도"
                    title="이전 연도"
                  >
                    <ChevronLeft size={15} aria-hidden="true" />
                  </Button>
                  <span className="text-sm font-semibold text-ink">{pickerYear}년</span>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setPickerYear((year) => year + 1)}
                    aria-label="다음 연도"
                    title="다음 연도"
                  >
                    <ChevronRight size={15} aria-hidden="true" />
                  </Button>
                </div>
                <div className="mt-2 grid grid-cols-4 gap-1">
                  {Array.from({ length: 12 }, (_, month) => {
                    const isSelected =
                      pickerYear === monthDate.getFullYear() && month === monthDate.getMonth();

                    return (
                      <button
                        key={month}
                        type="button"
                        className={cx(
                          "rounded-md px-1 py-2 text-xs font-medium text-ink transition-colors",
                          isSelected ? "bg-mint text-white" : "hover:bg-field",
                        )}
                        onClick={() => selectMonth(month)}
                      >
                        {month + 1}월
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          ) : null}
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
