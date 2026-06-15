// 대시보드 월간 집계 계산을 검증합니다.
import { expect, test } from "@playwright/test";
import {
  filterTransactionsByCardCompanies,
  getMonthSummary,
  getTransactionsForMonth,
} from "../src/features/dashboard/dashboard-calculations";
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

test("getMonthSummary groups monthly card expenses by card company source", () => {
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
      id: "hyundai-card",
      label: "현대카드",
      amount: 30000,
      transactionCount: 1,
    },
    {
      id: "shinhan-card",
      label: "신한카드",
      amount: 20000,
      transactionCount: 2,
    },
  ]);
});

test("filterTransactionsByCardCompanies keeps only selected card company transactions", () => {
  const transactions = [
    transaction("shinhan-file", "2026-06-01", "expense", 12000, "[신한카드] 스타벅스", "shinhan-file"),
    transaction("shinhan-alert", "2026-06-02", "expense", 8000, "[신한카드] 편의점", "shinhan-notification"),
    transaction("hyundai-file", "2026-06-03", "expense", 30000, "[현대카드] 백화점", "hyundai-card-file"),
    transaction("manual", "2026-06-04", "expense", 9000, "직접 입력", "manual"),
    transaction("bank", "2026-06-05", "expense", 7000, "[국민은행] 이체", "bank-file"),
    transaction("pay", "2026-06-06", "expense", 6000, "[네이버페이] 결제", "naver-pay-file"),
  ];

  expect(filterTransactionsByCardCompanies(transactions, ["shinhan-card"]).map((item) => item.id)).toEqual([
    "shinhan-file",
    "shinhan-alert",
  ]);
  expect(filterTransactionsByCardCompanies(transactions, ["hyundai-card"]).map((item) => item.id)).toEqual([
    "hyundai-file",
  ]);
  expect(filterTransactionsByCardCompanies(transactions, []).map((item) => item.id)).toEqual([]);
});
