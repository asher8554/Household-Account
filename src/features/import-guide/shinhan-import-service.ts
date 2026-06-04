// 신한카드 가져오기 후보의 중복 판정과 저장을 처리합니다.
import { ensureFallbackCategory } from "../categories/category-service";
import { createTransactionDuplicateKey, extractTransactionApprovalNo } from "../transactions/merchant-key";
import { addTransactions, removeDuplicateTransactions } from "../transactions/transaction-service";
import type { Transaction } from "../transactions/transaction-types";
import type { ShinhanParsedCandidate, ShinhanPreviewItem } from "./shinhan-import-types";
import { createMatchKey, formatImportedMemo } from "./shinhan-normalizers";

export function buildShinhanPreview(
  candidates: ShinhanParsedCandidate[],
  existingTransactions: Transaction[],
): ShinhanPreviewItem[] {
  const existingKeys = new Set(existingTransactions.map(toExistingMatchKey).filter(Boolean));
  const seenIncomingKeys = new Set<string>();

  const items: ShinhanPreviewItem[] = candidates.map((candidate) => {
    const matchKey = createCandidateMatchKey(candidate);
    const invalidReason = getInvalidReason(candidate);

    if (invalidReason) {
      return {
        ...candidate,
        matchKey,
        previewStatus: "invalid",
        reason: invalidReason,
      };
    }

    if (existingKeys.has(matchKey) || seenIncomingKeys.has(matchKey)) {
      seenIncomingKeys.add(matchKey);
      return {
        ...candidate,
        matchKey,
        previewStatus: "duplicate",
        reason: "이미 저장된 거래 후보.",
      };
    }

    seenIncomingKeys.add(matchKey);
    return {
      ...candidate,
      matchKey,
      previewStatus: "ready",
      reason: candidate.note ?? "저장 가능.",
    };
  });

  return collapseDuplicatePreviewItems(items);
}

export async function importReadyShinhanItems(items: ShinhanPreviewItem[]) {
  const readyItems = items.filter((item) => item.previewStatus === "ready");
  if (readyItems.length === 0) return 0;

  const fallbackIds = {
    expense: await ensureFallbackCategory("expense"),
    income: await ensureFallbackCategory("income"),
  };

  await addTransactions(
    readyItems.map((item) => ({
      date: item.date,
      type: item.type,
      amount: item.amount,
      categoryId: fallbackIds[item.type],
      memo: formatImportedMemo(item),
      source: item.transactionSource,
    })),
  );
  await removeDuplicateTransactions();

  return readyItems.length;
}

function getInvalidReason(candidate: ShinhanParsedCandidate) {
  if (!candidate.date) return "날짜 없음.";
  if (!candidate.amount) return "금액 없음.";
  if (!candidate.merchant) return "가맹점명 없음.";
  return "";
}

function toExistingMatchKey(transaction: Transaction) {
  return createTransactionDuplicateKey(transaction);
}

function createCandidateMatchKey(candidate: ShinhanParsedCandidate) {
  const approvalNo = normalizeApprovalNo(candidate.approvalNo);
  if (approvalNo) return [candidate.type, candidate.date, candidate.amount, `approval:${approvalNo}`].join("|");

  return createMatchKey(candidate.type, candidate.date, candidate.amount, candidate.merchant);
}

function collapseDuplicatePreviewItems(items: ShinhanPreviewItem[]) {
  const duplicateGroups = new Map<string, { item: ShinhanPreviewItem; count: number }>();
  const collapsedItems: ShinhanPreviewItem[] = [];

  for (const item of items) {
    if (item.previewStatus !== "duplicate") {
      collapsedItems.push(item);
      continue;
    }

    const group = duplicateGroups.get(item.matchKey);
    if (group) {
      group.count += 1;
      continue;
    }

    const representative = { ...item };
    duplicateGroups.set(item.matchKey, { item: representative, count: 1 });
    collapsedItems.push(representative);
  }

  duplicateGroups.forEach(({ item, count }) => {
    if (count > 1) {
      item.reason = `${item.reason} 동일 중복 후보 ${count}건을 1개로 묶었습니다.`;
    }
  });

  return collapsedItems;
}

function normalizeApprovalNo(value: string) {
  return value.replace(/[^A-Za-z0-9]/g, "").toLowerCase();
}
