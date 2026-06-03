// JSON 백업 내보내기, 병합 가져오기, 전체 초기화를 처리합니다.
import { db } from "../../db/db";
import { createDefaultCategories, getFallbackCategoryId } from "../categories/category-presets";
import { ensureDefaultCategories, ensureFallbackCategory } from "../categories/category-service";
import type { Category } from "../categories/category-types";
import type { Transaction } from "../transactions/transaction-types";
import { backupFileSchema, type ParsedBackupFile } from "./backup-schema";
import type { BackupFile, ImportSummary } from "./backup-types";

function isIncomingNewer(incomingUpdatedAt: string, existingUpdatedAt: string) {
  return new Date(incomingUpdatedAt).getTime() >= new Date(existingUpdatedAt).getTime();
}

function normalizeCategory(category: ParsedBackupFile["categories"][number], index: number): Category {
  const now = new Date().toISOString();

  return {
    id: category.id,
    type: category.type,
    name: category.name.trim(),
    color: category.color,
    isDefault: category.isDefault,
    isActive: category.isActive,
    sortOrder: category.sortOrder ?? index + 999,
    createdAt: category.createdAt ?? now,
    updatedAt: category.updatedAt ?? category.createdAt ?? now,
  };
}

function normalizeTransaction(transaction: ParsedBackupFile["transactions"][number]): Transaction {
  const now = new Date().toISOString();

  return {
    id: transaction.id,
    date: transaction.date,
    type: transaction.type,
    amount: transaction.amount,
    categoryId: transaction.categoryId,
    memo: transaction.memo.trim(),
    source: transaction.source,
    createdAt: transaction.createdAt ?? now,
    updatedAt: transaction.updatedAt ?? transaction.createdAt ?? now,
  };
}

export async function createBackupData(): Promise<BackupFile> {
  await ensureDefaultCategories();

  const [categories, transactions] = await Promise.all([
    db.categories.orderBy("sortOrder").toArray(),
    db.transactions.orderBy("date").toArray(),
  ]);

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    categories,
    transactions,
  };
}

export async function downloadBackupFile() {
  const backup = await createBackupData();
  const blob = new Blob([JSON.stringify(backup, null, 2)], {
    type: "application/json;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `household-account-${backup.exportedAt.slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

export async function importBackupData(raw: unknown): Promise<ImportSummary> {
  const parsed = backupFileSchema.parse(raw);
  await ensureDefaultCategories();

  const incomingCategories = parsed.categories.map(normalizeCategory);
  const existingCategories = await db.categories.toArray();
  const existingCategoryMap = new Map(existingCategories.map((category) => [category.id, category]));
  const categoryWrites: Category[] = [];
  let categoriesAdded = 0;
  let categoriesUpdated = 0;

  for (const category of incomingCategories) {
    const existing = existingCategoryMap.get(category.id);

    if (!existing) {
      categoriesAdded += 1;
      categoryWrites.push(category);
      continue;
    }

    if (isIncomingNewer(category.updatedAt, existing.updatedAt)) {
      categoriesUpdated += 1;
      categoryWrites.push(category);
    }
  }

  if (categoryWrites.length > 0) {
    await db.categories.bulkPut(categoryWrites);
  }

  const fallbackIds = {
    expense: await ensureFallbackCategory("expense"),
    income: await ensureFallbackCategory("income"),
  };
  const allCategories = await db.categories.toArray();
  const categoryIds = new Set(allCategories.map((category) => category.id));
  const incomingTransactions = parsed.transactions.map(normalizeTransaction).map((transaction) => {
    if (categoryIds.has(transaction.categoryId)) return transaction;

    return {
      ...transaction,
      categoryId: fallbackIds[transaction.type],
      updatedAt: new Date().toISOString(),
    };
  });

  const existingTransactions = await db.transactions.toArray();
  const existingTransactionMap = new Map(
    existingTransactions.map((transaction) => [transaction.id, transaction]),
  );
  const transactionWrites: Transaction[] = [];
  let transactionsAdded = 0;
  let transactionsUpdated = 0;
  let transactionsSkipped = 0;

  for (const transaction of incomingTransactions) {
    const existing = existingTransactionMap.get(transaction.id);

    if (!existing) {
      transactionsAdded += 1;
      transactionWrites.push(transaction);
      continue;
    }

    if (isIncomingNewer(transaction.updatedAt, existing.updatedAt)) {
      transactionsUpdated += 1;
      transactionWrites.push(transaction);
    } else {
      transactionsSkipped += 1;
    }
  }

  if (transactionWrites.length > 0) {
    await db.transactions.bulkPut(transactionWrites);
  }

  return {
    categoriesAdded,
    categoriesUpdated,
    transactionsAdded,
    transactionsUpdated,
    transactionsSkipped,
  };
}

export async function importBackupFile(file: File) {
  const text = await file.text();
  return importBackupData(JSON.parse(text));
}

export async function resetAllData() {
  const now = new Date().toISOString();

  await db.transaction("rw", db.categories, db.transactions, db.cardImportStatuses, async () => {
    await db.transactions.clear();
    await db.cardImportStatuses.clear();
    await db.categories.clear();
    await db.categories.bulkPut(createDefaultCategories(now));
  });
}

export function fallbackCategoryIdForType(type: "income" | "expense") {
  return getFallbackCategoryId(type);
}
