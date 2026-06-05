// 연간 소비 추세와 카테고리별 변화 집계를 계산합니다.
import type { Category } from "../categories/category-types";
import type { Transaction } from "../transactions/transaction-types";

export const ANNUAL_OTHER_CATEGORY_ID = "annual-other";

const ANNUAL_OTHER_CATEGORY_NAME = "기타 묶음";
const ANNUAL_OTHER_CATEGORY_COLOR = "#6d746a";

export type AnnualTrendMonth = {
  month: number;
  label: string;
  income: number;
  expense: number;
  net: number;
  transactionCount: number;
  expenseDelta: number | null;
  maxExpenseShare: number;
};

export type AnnualTrendSummary = {
  totalIncome: number;
  totalExpense: number;
  net: number;
  monthlyAverageExpense: number;
  expenseMonths: number;
  transactionCount: number;
  peakMonth: AnnualTrendMonth | null;
};

export type AnnualCategoryTrendMonth = {
  month: number;
  label: string;
  totalExpense: number;
  [categoryId: string]: number | string;
};

export type AnnualCategoryTrend = {
  categoryId: string;
  name: string;
  color: string;
  totalExpense: number;
  share: number;
  peakMonthLabel: string;
  recentExpense: number;
  previousExpense: number;
  recentDelta: number | null;
};

export type AnnualCategoryTrendResult = {
  months: AnnualCategoryTrendMonth[];
  categories: AnnualCategoryTrend[];
  totalExpense: number;
  recentWindowLabel: string;
  previousWindowLabel: string;
};

export function buildAnnualMonthTrends(transactions: Transaction[], year: number): AnnualTrendMonth[] {
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

export function getAnnualTrendSummary(months: AnnualTrendMonth[]): AnnualTrendSummary {
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

export function buildAnnualCategoryTrends(
  transactions: Transaction[],
  categories: Category[],
  year: number,
  topCategoryLimit = 8,
): AnnualCategoryTrendResult {
  const yearlyExpenses = transactions.filter(
    (transaction) => transaction.type === "expense" && transaction.date.startsWith(`${year}-`),
  );
  const categoryMap = new Map(categories.map((category) => [category.id, category]));
  const totalsByCategory = new Map<string, number>();

  for (const transaction of yearlyExpenses) {
    totalsByCategory.set(
      transaction.categoryId,
      (totalsByCategory.get(transaction.categoryId) ?? 0) + transaction.amount,
    );
  }

  const visibleLimit = Math.max(1, topCategoryLimit);
  const topCategoryIds = new Set(
    [...totalsByCategory.entries()]
      .sort((a, b) => b[1] - a[1] || getCategoryName(a[0], categoryMap).localeCompare(getCategoryName(b[0], categoryMap)))
      .slice(0, visibleLimit)
      .map(([categoryId]) => categoryId),
  );
  const hasOther = totalsByCategory.size > topCategoryIds.size;
  const visibleCategoryIds = [...topCategoryIds];
  const months: AnnualCategoryTrendMonth[] = Array.from({ length: 12 }, (_, index) => {
    const month: AnnualCategoryTrendMonth = {
      month: index + 1,
      label: `${index + 1}월`,
      totalExpense: 0,
    };

    for (const categoryId of visibleCategoryIds) {
      month[categoryId] = 0;
    }

    if (hasOther) {
      month[ANNUAL_OTHER_CATEGORY_ID] = 0;
    }

    return month;
  });

  for (const transaction of yearlyExpenses) {
    const monthIndex = Number(transaction.date.slice(5, 7)) - 1;
    const month = months[monthIndex];
    if (!month) continue;

    const categoryId =
      topCategoryIds.has(transaction.categoryId) || !hasOther
        ? transaction.categoryId
        : ANNUAL_OTHER_CATEGORY_ID;
    month[categoryId] = Number(month[categoryId] ?? 0) + transaction.amount;
    month.totalExpense += transaction.amount;
  }

  const totalExpense = months.reduce((sum, month) => sum + month.totalExpense, 0);
  const latestActiveMonthIndex = getLatestActiveMonthIndex(months);
  const recentEnd = latestActiveMonthIndex >= 0 ? latestActiveMonthIndex : 11;
  const recentStart = Math.max(0, recentEnd - 2);
  const previousEnd = recentStart - 1;
  const previousStart = Math.max(0, previousEnd - 2);
  const hasPreviousWindow = previousEnd >= 0;
  const summaryCategoryIds = hasOther
    ? [...visibleCategoryIds, ANNUAL_OTHER_CATEGORY_ID]
    : visibleCategoryIds;
  const categorySummaries = summaryCategoryIds
    .map((categoryId) => {
      const monthlyExpenses = months.map((month) => Number(month[categoryId] ?? 0));
      const categoryTotal = monthlyExpenses.reduce((sum, amount) => sum + amount, 0);
      const peakMonthIndex = getPeakMonthIndex(monthlyExpenses);
      const recentExpense = sumMonthRange(monthlyExpenses, recentStart, recentEnd);
      const previousExpense = hasPreviousWindow ? sumMonthRange(monthlyExpenses, previousStart, previousEnd) : 0;

      return {
        categoryId,
        name: getCategoryName(categoryId, categoryMap),
        color: getCategoryColor(categoryId, categoryMap),
        totalExpense: categoryTotal,
        share: totalExpense > 0 ? (categoryTotal / totalExpense) * 100 : 0,
        peakMonthLabel: monthlyExpenses[peakMonthIndex] > 0 ? `${peakMonthIndex + 1}월` : "없음",
        recentExpense,
        previousExpense,
        recentDelta: hasPreviousWindow ? recentExpense - previousExpense : null,
      };
    })
    .filter((category) => category.totalExpense > 0)
    .sort((a, b) => b.totalExpense - a.totalExpense || a.name.localeCompare(b.name));

  return {
    months,
    categories: categorySummaries,
    totalExpense,
    recentWindowLabel: formatMonthWindow(recentStart, recentEnd),
    previousWindowLabel: hasPreviousWindow ? formatMonthWindow(previousStart, previousEnd) : "",
  };
}

function getCategoryName(categoryId: string, categoryMap: Map<string, Category>) {
  if (categoryId === ANNUAL_OTHER_CATEGORY_ID) return ANNUAL_OTHER_CATEGORY_NAME;
  return categoryMap.get(categoryId)?.name ?? "기타";
}

function getCategoryColor(categoryId: string, categoryMap: Map<string, Category>) {
  if (categoryId === ANNUAL_OTHER_CATEGORY_ID) return ANNUAL_OTHER_CATEGORY_COLOR;
  return categoryMap.get(categoryId)?.color ?? ANNUAL_OTHER_CATEGORY_COLOR;
}

function getLatestActiveMonthIndex(months: AnnualCategoryTrendMonth[]) {
  let latestIndex = -1;

  for (let index = 0; index < months.length; index += 1) {
    if (months[index].totalExpense > 0) {
      latestIndex = index;
    }
  }

  return latestIndex;
}

function getPeakMonthIndex(monthlyExpenses: number[]) {
  let peakIndex = 0;
  let peakExpense = 0;

  for (let index = 0; index < monthlyExpenses.length; index += 1) {
    if (monthlyExpenses[index] > peakExpense) {
      peakIndex = index;
      peakExpense = monthlyExpenses[index];
    }
  }

  return peakIndex;
}

function sumMonthRange(monthlyExpenses: number[], startIndex: number, endIndex: number) {
  if (startIndex < 0 || endIndex < startIndex) return 0;

  let sum = 0;

  for (let index = startIndex; index <= endIndex; index += 1) {
    sum += monthlyExpenses[index] ?? 0;
  }

  return sum;
}

function formatMonthWindow(startIndex: number, endIndex: number) {
  if (startIndex === endIndex) return `${startIndex + 1}월`;
  return `${startIndex + 1}월-${endIndex + 1}월`;
}
