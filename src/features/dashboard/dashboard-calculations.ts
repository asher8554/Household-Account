// 달력과 월간 요약에 필요한 거래 집계를 계산합니다.
import { getDaysInMonth } from "date-fns";
import { isDateKeyInMonth } from "../../lib/date";
import type { Category } from "../categories/category-types";
import type { Transaction } from "../transactions/transaction-types";

export type DailySummary = {
  date: string;
  income: number;
  expense: number;
  topExpenseCategoryId: string | null;
};

export type MonthSummary = {
  income: number;
  expense: number;
  net: number;
  dailyAverageExpense: number;
  transactionCount: number;
  cardExpenses: CardExpenseStat[];
};

export type CardExpenseStat = {
  label: string;
  amount: number;
  transactionCount: number;
};

export type CategoryExpenseStat = {
  categoryId: string;
  name: string;
  color: string;
  amount: number;
};

const cardSourceLabels: Partial<Record<Transaction["source"], string>> = {
  "shinhan-file": "신한카드",
  "hyundai-card-file": "현대카드",
  "shinhan-notification": "신한카드",
};

export function getTransactionsForMonth(transactions: Transaction[], monthDate: Date) {
  return transactions.filter((transaction) => isDateKeyInMonth(transaction.date, monthDate));
}

export function buildDailySummaries(transactions: Transaction[]) {
  const map = new Map<string, DailySummary>();
  const categoryTotalsByDate = new Map<string, Map<string, number>>();

  for (const transaction of transactions) {
    const summary = map.get(transaction.date) ?? {
      date: transaction.date,
      income: 0,
      expense: 0,
      topExpenseCategoryId: null,
    };

    if (transaction.type === "income") {
      summary.income += transaction.amount;
    } else {
      summary.expense += transaction.amount;
      const categoryTotals = categoryTotalsByDate.get(transaction.date) ?? new Map<string, number>();
      categoryTotals.set(
        transaction.categoryId,
        (categoryTotals.get(transaction.categoryId) ?? 0) + transaction.amount,
      );
      categoryTotalsByDate.set(transaction.date, categoryTotals);
    }

    map.set(transaction.date, summary);
  }

  for (const [date, categoryTotals] of categoryTotalsByDate) {
    const top = [...categoryTotals.entries()].sort((a, b) => b[1] - a[1])[0];
    const summary = map.get(date);

    if (summary && top) {
      summary.topExpenseCategoryId = top[0];
    }
  }

  return map;
}

export function getMonthSummary(transactions: Transaction[], monthDate: Date): MonthSummary {
  const income = transactions
    .filter((transaction) => transaction.type === "income")
    .reduce((sum, transaction) => sum + transaction.amount, 0);
  const expense = transactions
    .filter((transaction) => transaction.type === "expense")
    .reduce((sum, transaction) => sum + transaction.amount, 0);
  const dayCount = getDaysInMonth(monthDate);

  return {
    income,
    expense,
    net: income - expense,
    dailyAverageExpense: dayCount > 0 ? Math.round(expense / dayCount) : 0,
    transactionCount: transactions.length,
    cardExpenses: getCardExpenseStats(transactions),
  };
}

export function getCardExpenseStats(transactions: Transaction[]): CardExpenseStat[] {
  const totals = new Map<string, CardExpenseStat>();

  for (const transaction of transactions) {
    if (transaction.type !== "expense") continue;

    const fallbackLabel = cardSourceLabels[transaction.source];
    if (!fallbackLabel) continue;

    const label = getCardExpenseLabel(transaction.memo, fallbackLabel);
    const current = totals.get(label) ?? {
      label,
      amount: 0,
      transactionCount: 0,
    };

    current.amount += transaction.amount;
    current.transactionCount += 1;
    totals.set(label, current);
  }

  return [...totals.values()].sort(
    (a, b) => b.amount - a.amount || a.label.localeCompare(b.label, "ko-KR"),
  );
}

export function getMaxDailyExpense(dailySummaries: Map<string, DailySummary>) {
  return Math.max(0, ...[...dailySummaries.values()].map((summary) => summary.expense));
}

export function getCategoryExpenseStats(
  transactions: Transaction[],
  categories: Category[],
): CategoryExpenseStat[] {
  const categoryMap = new Map(categories.map((category) => [category.id, category]));
  const totals = new Map<string, number>();

  for (const transaction of transactions) {
    if (transaction.type !== "expense") continue;
    totals.set(transaction.categoryId, (totals.get(transaction.categoryId) ?? 0) + transaction.amount);
  }

  return [...totals.entries()]
    .map(([categoryId, amount]) => {
      const category = categoryMap.get(categoryId);

      return {
        categoryId,
        name: category?.name ?? "기타",
        color: category?.color ?? "#6d746a",
        amount,
      };
    })
    .sort((a, b) => b.amount - a.amount);
}

function getCardExpenseLabel(memo: string, fallbackLabel: string) {
  const cardName = memo.match(/(?:^|\/)\s*카드\s*[:：]?\s*([^/]+)/)?.[1]?.trim();
  if (cardName) return cardName;

  return memo.match(/^\[([^\]]+)\]/)?.[1]?.trim() || fallbackLabel;
}
