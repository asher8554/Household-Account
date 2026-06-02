// 거래 추가, 삭제, 조회 같은 저장소 작업을 제공합니다.
import { db } from "../../db/db";
import { createId } from "../../lib/id";
import type { Transaction, TransactionDraft } from "./transaction-types";

export async function listTransactions() {
  return db.transactions.orderBy("date").toArray();
}

export async function addTransaction(draft: TransactionDraft) {
  const now = new Date().toISOString();
  const transaction: Transaction = {
    id: createId("tx"),
    date: draft.date,
    type: draft.type,
    amount: draft.amount,
    categoryId: draft.categoryId,
    memo: draft.memo.trim(),
    source: "manual",
    createdAt: now,
    updatedAt: now,
  };

  await db.transactions.put(transaction);
  return transaction;
}

export async function deleteTransaction(id: string) {
  await db.transactions.delete(id);
}

export async function clearTransactions() {
  await db.transactions.clear();
}
