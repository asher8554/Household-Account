// 연간 소비 추세 집계 로직을 검증합니다.
import { expect, test } from "@playwright/test";
import { buildAnnualCategoryTrends } from "../src/features/dashboard/annual-trend-calculations";
import type { Category } from "../src/features/categories/category-types";
import type { Transaction } from "../src/features/transactions/transaction-types";

function category(id: string, name: string, color = "#c85645"): Category {
  return {
    id,
    type: "expense",
    name,
    color,
    isDefault: true,
    isActive: true,
    sortOrder: 0,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

function transaction(
  id: string,
  date: string,
  type: Transaction["type"],
  amount: number,
  categoryId: string,
): Transaction {
  return {
    id,
    date,
    type,
    amount,
    categoryId,
    memo: id,
    source: "manual",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

test("buildAnnualCategoryTrends groups lower-ranked categories and compares recent three months", () => {
  const categories = [
    category("expense-food", "식비", "#c85645"),
    category("expense-cafe", "카페", "#d49a2d"),
    category("expense-transport", "교통", "#4b7a9f"),
    category("expense-medical", "의료", "#b3566a"),
    category("expense-shopping", "쇼핑", "#9b5e3c"),
  ];
  const transactions = [
    transaction("jan-food", "2026-01-03", "expense", 100, "expense-food"),
    transaction("jan-cafe", "2026-01-04", "expense", 50, "expense-cafe"),
    transaction("feb-food", "2026-02-10", "expense", 200, "expense-food"),
    transaction("mar-transport", "2026-03-11", "expense", 300, "expense-transport"),
    transaction("apr-transport", "2026-04-12", "expense", 100, "expense-transport"),
    transaction("may-medical", "2026-05-13", "expense", 500, "expense-medical"),
    transaction("jun-shopping", "2026-06-14", "expense", 70, "expense-shopping"),
    transaction("ignored-income", "2026-06-20", "income", 9999, "income-salary"),
    transaction("ignored-year", "2025-06-20", "expense", 9999, "expense-food"),
  ];

  const result = buildAnnualCategoryTrends(transactions, categories, 2026, 2);

  expect(result.totalExpense).toBe(1320);
  expect(result.recentWindowLabel).toBe("4월-6월");
  expect(result.previousWindowLabel).toBe("1월-3월");
  expect(result.categories.map((item) => item.categoryId)).toEqual([
    "expense-medical",
    "annual-other",
    "expense-transport",
  ]);
  expect(result.months[0]["annual-other"]).toBe(150);
  expect(result.months[1]["annual-other"]).toBe(200);
  expect(result.months[5]["annual-other"]).toBe(70);

  const medical = result.categories.find((item) => item.categoryId === "expense-medical");
  const transport = result.categories.find((item) => item.categoryId === "expense-transport");
  const other = result.categories.find((item) => item.categoryId === "annual-other");

  expect(medical?.totalExpense).toBe(500);
  expect(medical?.peakMonthLabel).toBe("5월");
  expect(medical?.recentDelta).toBe(500);
  expect(transport?.recentDelta).toBe(-200);
  expect(other?.totalExpense).toBe(420);
  expect(other?.recentDelta).toBe(-280);
});
