// 카드 파일 로드 상태를 IndexedDB에 기록하고 조회합니다.
import { db } from "../../db/db";
import type { TransactionSource } from "../transactions/transaction-types";
import type { CardImportSource, CardImportStatus } from "./import-status-types";

export const staleImportThresholdDays = 15;

export const cardImportSources: Array<{ source: CardImportSource; label: string }> = [
  { source: "shinhan-file", label: "신한카드" },
  { source: "hyundai-card-file", label: "현대카드" },
];

const trackedSources = new Set<TransactionSource>(cardImportSources.map((item) => item.source));

type RecordCardFileLoadInput = {
  source: CardImportSource;
  fileName: string;
  totalCount: number;
  readyCount: number;
  duplicateCount: number;
  invalidCount: number;
};

export function isTrackedCardImportSource(source: TransactionSource): source is CardImportSource {
  return trackedSources.has(source);
}

export async function listCardImportStatuses() {
  const statuses = await db.cardImportStatuses.toArray();
  const order = new Map(cardImportSources.map((item, index) => [item.source, index]));

  return statuses.sort((a, b) => (order.get(a.source) ?? 999) - (order.get(b.source) ?? 999));
}

export async function recordCardFileLoad(input: RecordCardFileLoadInput) {
  const now = new Date().toISOString();
  const existing = await db.cardImportStatuses.get(input.source);
  const status: CardImportStatus = {
    source: input.source,
    lastLoadedAt: now,
    lastFileName: input.fileName,
    lastCandidateCount: input.totalCount,
    lastReadyCount: input.readyCount,
    lastDuplicateCount: input.duplicateCount,
    lastInvalidCount: input.invalidCount,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  await db.cardImportStatuses.put(status);
  return status;
}
