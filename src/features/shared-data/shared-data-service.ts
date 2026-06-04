// GitHub Pages에 배포된 공개 공유 데이터를 IndexedDB에 반영합니다.
import { db } from "../../db/db";
import { backupFileSchema } from "../backup/backup-schema";
import { replaceWithBackupData } from "../backup/backup-service";

const sharedDataFileName = "shared-data.json";
const appliedExportedAtKey = "household-account-shared-data-exported-at";

export type SharedDataLoadResult = {
  status: "missing" | "empty" | "current" | "applied" | "skipped-local-newer" | "invalid" | "error";
  exportedAt?: string;
  transactions?: number;
};

function toTimestamp(value: string | undefined) {
  if (!value) return 0;

  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function getSharedDataUrl() {
  const baseUrl = import.meta.env.BASE_URL || "/";
  const normalizedBaseUrl = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  const url = new URL(`${normalizedBaseUrl}${sharedDataFileName}`, window.location.href);

  url.searchParams.set("v", Date.now().toString());
  return url.toString();
}

async function getLatestLocalTransactionTimestamp() {
  const transactions = await db.transactions.toArray();

  return transactions.reduce((latest, transaction) => {
    return Math.max(latest, toTimestamp(transaction.updatedAt), toTimestamp(transaction.createdAt));
  }, 0);
}

export async function loadPublishedSharedData(): Promise<SharedDataLoadResult> {
  try {
    const response = await fetch(getSharedDataUrl(), { cache: "no-store" });

    if (response.status === 404) {
      return { status: "missing" };
    }

    if (!response.ok) {
      return { status: "error" };
    }

    const raw = await response.json();
    const parsed = backupFileSchema.safeParse(raw);

    if (!parsed.success) {
      return { status: "invalid" };
    }

    const backup = parsed.data;

    if (backup.categories.length === 0 && backup.transactions.length === 0) {
      return { status: "empty", exportedAt: backup.exportedAt, transactions: 0 };
    }

    const appliedExportedAt = window.localStorage.getItem(appliedExportedAtKey);

    if (appliedExportedAt === backup.exportedAt) {
      return { status: "current", exportedAt: backup.exportedAt, transactions: backup.transactions.length };
    }

    const sharedExportedAtTimestamp = toTimestamp(backup.exportedAt);
    const latestLocalTransactionTimestamp = await getLatestLocalTransactionTimestamp();

    if (latestLocalTransactionTimestamp > sharedExportedAtTimestamp) {
      return {
        status: "skipped-local-newer",
        exportedAt: backup.exportedAt,
        transactions: backup.transactions.length,
      };
    }

    await replaceWithBackupData(backup);
    window.localStorage.setItem(appliedExportedAtKey, backup.exportedAt);

    return { status: "applied", exportedAt: backup.exportedAt, transactions: backup.transactions.length };
  } catch {
    return { status: "error" };
  }
}
