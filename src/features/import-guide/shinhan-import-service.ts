// 신한카드 가져오기 후보의 중복 판정과 저장을 처리합니다.
import { ensureFallbackCategory } from "../categories/category-service";
import { addTransactions } from "../transactions/transaction-service";
import type { Transaction } from "../transactions/transaction-types";
import type { ShinhanParsedCandidate, ShinhanPreviewItem } from "./shinhan-import-types";
import { createMatchKey, formatImportedMemo, normalizeMatchText } from "./shinhan-normalizers";

export function buildShinhanPreview(
  candidates: ShinhanParsedCandidate[],
  existingTransactions: Transaction[],
): ShinhanPreviewItem[] {
  const existingKeys = new Set(existingTransactions.map(toExistingMatchKey).filter(Boolean));
  const seenIncomingKeys = new Set<string>();

  return candidates.map((candidate) => {
    const matchKey = createMatchKey(candidate.type, candidate.date, candidate.amount, candidate.merchant);
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

  return readyItems.length;
}

function getInvalidReason(candidate: ShinhanParsedCandidate) {
  if (!candidate.date) return "날짜 없음.";
  if (!candidate.amount) return "금액 없음.";
  if (!candidate.merchant) return "가맹점명 없음.";
  return "";
}

function toExistingMatchKey(transaction: Transaction) {
  const merchant = normalizeMatchText(transaction.memo);
  if (!merchant) return "";

  return createMatchKey(transaction.type, transaction.date, transaction.amount, merchant);
}
