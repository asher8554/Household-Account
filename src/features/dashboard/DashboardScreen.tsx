// 단일 화면 대시보드를 조립하고 각 기능 모듈을 연결합니다.
import { useEffect, useMemo, useState } from "react";
import { addMonths, startOfMonth, subMonths } from "date-fns";
import { getTodayKey, isDateKeyInMonth, toDateKey } from "../../lib/date";
import { useLiveQuery } from "../../db/use-live-query";
import { listCategories } from "../categories/category-service";
import { CategoryManager } from "../categories/CategoryManager";
import { BackupPanel } from "../backup/BackupPanel";
import { TransactionForm } from "../transactions/TransactionForm";
import {
  deleteTransaction,
  listTransactions,
  removeDuplicateTransactions,
  updateSameMerchantCategory,
  updateTransactionCategory,
} from "../transactions/transaction-service";
import { SectionPanel } from "../../shared/ui/SectionPanel";
import {
  buildDailySummaries,
  getCategoryExpenseStats,
  getMaxDailyExpense,
  getMonthSummary,
  getTransactionsForMonth,
} from "./dashboard-calculations";
import { CalendarGrid } from "./CalendarGrid";
import { CategoryExpenseChart } from "./CategoryExpenseChart";
import { DayDetailPanel } from "./DayDetailPanel";
import { MonthSummaryCards } from "./MonthSummaryCards";

const initialData = {
  categories: [],
  transactions: [],
};

export function DashboardScreen() {
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()));
  const [selectedDateKey, setSelectedDateKey] = useState(getTodayKey());
  const { data, error, isLoading } = useLiveQuery(
    async () => ({
      categories: await listCategories(),
      transactions: await listTransactions(),
    }),
    [],
    initialData,
  );

  useEffect(() => {
    void removeDuplicateTransactions();
  }, []);

  const monthlyTransactions = useMemo(
    () => getTransactionsForMonth(data.transactions, currentMonth),
    [data.transactions, currentMonth],
  );
  const dailySummaries = useMemo(() => buildDailySummaries(monthlyTransactions), [monthlyTransactions]);
  const maxDailyExpense = useMemo(() => getMaxDailyExpense(dailySummaries), [dailySummaries]);
  const monthSummary = useMemo(
    () => getMonthSummary(monthlyTransactions, currentMonth),
    [monthlyTransactions, currentMonth],
  );
  const categoryStats = useMemo(
    () => getCategoryExpenseStats(monthlyTransactions, data.categories),
    [monthlyTransactions, data.categories],
  );
  const selectedDateTransactions = useMemo(
    () =>
      data.transactions
        .filter((transaction) => transaction.date === selectedDateKey)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [data.transactions, selectedDateKey],
  );

  function moveMonth(nextMonth: Date) {
    setCurrentMonth(nextMonth);

    if (!isDateKeyInMonth(selectedDateKey, nextMonth)) {
      setSelectedDateKey(toDateKey(startOfMonth(nextMonth)));
    }
  }

  function moveToPreviousMonth() {
    moveMonth(subMonths(currentMonth, 1));
  }

  function moveToNextMonth() {
    moveMonth(addMonths(currentMonth, 1));
  }

  function moveToCurrentMonth() {
    const today = new Date();
    setCurrentMonth(startOfMonth(today));
    setSelectedDateKey(toDateKey(today));
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
      <MonthSummaryCards summary={monthSummary} />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_390px]">
        <div className="grid gap-5">
          <CalendarGrid
            monthDate={currentMonth}
            selectedDateKey={selectedDateKey}
            dailySummaries={dailySummaries}
            maxDailyExpense={maxDailyExpense}
            categories={data.categories}
            onSelectDate={(dateKey, date) => {
              setSelectedDateKey(dateKey);

              if (!isDateKeyInMonth(dateKey, currentMonth)) {
                setCurrentMonth(startOfMonth(date));
              }
            }}
            onPreviousMonth={moveToPreviousMonth}
            onNextMonth={moveToNextMonth}
            onCurrentMonth={moveToCurrentMonth}
          />
          <CategoryExpenseChart
            monthDate={currentMonth}
            stats={categoryStats}
            transactions={monthlyTransactions}
            categories={data.categories}
            onPreviousMonth={moveToPreviousMonth}
            onCurrentMonth={moveToCurrentMonth}
            onNextMonth={moveToNextMonth}
            onDeleteTransaction={(id) => void deleteTransaction(id)}
            onChangeTransactionCategory={(id, categoryId) => void updateSameMerchantCategory(id, categoryId)}
            onChangeSingleTransactionCategory={(id, categoryId) => void updateTransactionCategory(id, categoryId)}
          />
        </div>

        <aside className="grid content-start gap-5">
          <SectionPanel title="거래 입력" eyebrow={isLoading ? "로딩" : "간단 입력"}>
            <TransactionForm categories={data.categories} defaultDateKey={selectedDateKey} />
          </SectionPanel>
          <DayDetailPanel
            dateKey={selectedDateKey}
            transactions={selectedDateTransactions}
            categories={data.categories}
            onDeleteTransaction={(id) => void deleteTransaction(id)}
            onChangeTransactionCategory={(id, categoryId) => void updateSameMerchantCategory(id, categoryId)}
          />
          <BackupPanel />
          <CategoryManager categories={data.categories} />
        </aside>
      </div>
    </div>
  );
}
