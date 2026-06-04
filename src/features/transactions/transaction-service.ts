// 거래 추가, 삭제, 조회 같은 저장소 작업을 제공합니다.
import { db } from "../../db/db";
import { createId } from "../../lib/id";
import { normalizeTransactionMerchantKey } from "./merchant-key";
import type { Transaction, TransactionDraft } from "./transaction-types";

export async function listTransactions() {
  return db.transactions.orderBy("date").toArray();
}

export async function addTransaction(draft: TransactionDraft) {
  const [transaction] = await addTransactions([draft]);
  return transaction;
}

export async function addTransactions(drafts: TransactionDraft[]) {
  const now = new Date().toISOString();
  const transactions: Transaction[] = drafts.map((draft) => ({
    id: createId("tx"),
    date: draft.date,
    type: draft.type,
    amount: draft.amount,
    categoryId: draft.categoryId,
    memo: draft.memo.trim(),
    source: draft.source ?? "manual",
    createdAt: now,
    updatedAt: now,
  }));

  await db.transactions.bulkPut(transactions);
  return transactions;
}

export async function deleteTransaction(id: string) {
  await db.transactions.delete(id);
}

export async function updateSameMerchantCategory(transactionId: string, categoryId: string) {
  return db.transaction("rw", db.transactions, async () => {
    const target = await db.transactions.get(transactionId);
    if (!target) return 0;

    const merchantKey = normalizeTransactionMerchantKey(target.memo);
    const now = new Date().toISOString();

    if (!merchantKey) {
      const changed = await db.transactions.update(transactionId, { categoryId, updatedAt: now });
      return changed;
    }

    const sameTypeTransactions = await db.transactions.where("type").equals(target.type).toArray();
    const updates = sameTypeTransactions
      .filter((transaction) => normalizeTransactionMerchantKey(transaction.memo) === merchantKey)
      .filter((transaction) => transaction.categoryId !== categoryId)
      .map((transaction) => ({
        ...transaction,
        categoryId,
        updatedAt: now,
      }));

    if (updates.length > 0) {
      await db.transactions.bulkPut(updates);
    }

    return updates.length;
  });
}

export async function clearTransactions() {
  await db.transactions.clear();
}
