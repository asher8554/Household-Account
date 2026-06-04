// 거래 추가, 삭제, 조회 같은 저장소 작업을 제공합니다.
import { db } from "../../db/db";
import { createId } from "../../lib/id";
import { createTransactionDuplicateKey, normalizeTransactionMerchantKey } from "./merchant-key";
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

export async function updateTransactionCategory(transactionId: string, categoryId: string) {
  return db.transactions.update(transactionId, {
    categoryId,
    updatedAt: new Date().toISOString(),
  });
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

export async function removeDuplicateTransactions() {
  return db.transaction("rw", db.transactions, async () => {
    const transactions = await db.transactions.toArray();
    const groups = new Map<string, Transaction[]>();

    for (const transaction of transactions) {
      const duplicateKey = createTransactionDuplicateKey(transaction);
      if (!duplicateKey) continue;

      const group = groups.get(duplicateKey) ?? [];
      group.push(transaction);
      groups.set(duplicateKey, group);
    }

    const transactionUpdates: Transaction[] = [];
    const transactionIdsToDelete: string[] = [];

    for (const group of groups.values()) {
      if (group.length < 2) continue;

      const keeper = [...group].sort(compareOldestTransaction)[0];
      const latest = [...group].sort(compareNewestTransaction)[0];
      const keeperPatch =
        keeper.categoryId !== latest.categoryId || keeper.updatedAt !== latest.updatedAt
          ? { ...keeper, categoryId: latest.categoryId, updatedAt: latest.updatedAt }
          : null;

      if (keeperPatch) {
        transactionUpdates.push(keeperPatch);
      }

      transactionIdsToDelete.push(
        ...group.filter((transaction) => transaction.id !== keeper.id).map((transaction) => transaction.id),
      );
    }

    if (transactionUpdates.length > 0) {
      await db.transactions.bulkPut(transactionUpdates);
    }

    if (transactionIdsToDelete.length > 0) {
      await db.transactions.bulkDelete(transactionIdsToDelete);
    }

    return transactionIdsToDelete.length;
  });
}

export async function clearTransactions() {
  await db.transactions.clear();
}

function compareOldestTransaction(a: Transaction, b: Transaction) {
  return (
    toTime(a.createdAt) - toTime(b.createdAt) ||
    toTime(a.updatedAt) - toTime(b.updatedAt) ||
    a.id.localeCompare(b.id)
  );
}

function compareNewestTransaction(a: Transaction, b: Transaction) {
  return (
    toTime(b.updatedAt) - toTime(a.updatedAt) ||
    toTime(b.createdAt) - toTime(a.createdAt) ||
    b.id.localeCompare(a.id)
  );
}

function toTime(value: string) {
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
}
