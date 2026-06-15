// 대시보드 월간 집계 계산을 검증합니다.
import { expect, test } from "@playwright/test";
import { getMonthSummary, getTransactionsForMonth } from "../src/features/dashboard/dashboard-calculations";
import type { Transaction } from "../src/features/transactions/transaction-types";

function transaction(
  id: string,
  date: string,
  type: Transaction["type"],
  amount: number,
  memo: string,
  source: Transaction["source"],
): Transaction {
  return {
    id,
    date,
    type,
    amount,
    categoryId: type === "expense" ? "expense-other" : "income-other",
    memo,
    source,
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-06-01T00:00:00.000Z",
  };
}

test("getMonthSummary groups monthly card expenses by card detail and source fallback", () => {
  const monthDate = new Date("2026-06-01T00:00:00.000Z");
  const transactions = [
    transaction(
      "shinhan-1",
      "2026-06-01",
      "expense",
      12000,
      "[신한카드] 스타벅스 / 카드 Deep Dream / 승인번호 111",
      "shinhan-file",
    ),
    transaction(
      "shinhan-2",
      "2026-06-02",
      "expense",
      8000,
      "[신한카드] 편의점 / 카드 Deep Dream",
      "shinhan-notification",
    ),
    transaction("hyundai-1", "2026-06-03", "expense", 30000, "[현대카드] 백화점", "hyundai-card-file"),
    transaction("card-income", "2026-06-04", "income", 5000, "[현대카드] 환급 / 카드 M", "hyundai-card-file"),
    transaction("manual-card", "2026-06-05", "expense", 9000, "개인카드 결제", "manual"),
    transaction("previous-month", "2026-05-31", "expense", 10000, "[신한카드] 지난달 / 카드 Deep Dream", "shinhan-file"),
  ];

  const summary = getMonthSummary(getTransactionsForMonth(transactions, monthDate), monthDate);

  expect(summary.cardExpenses).toEqual([
    {
      label: "현대카드",
      amount: 30000,
      transactionCount: 1,
    },
    {
      label: "Deep Dream",
      amount: 20000,
      transactionCount: 2,
    },
  ]);
});
