// 신한카드 승인 알림 붙여넣기 텍스트를 거래 후보로 변환합니다.
import type { ShinhanParsedCandidate } from "./shinhan-import-types";
import { detectTransactionType, normalizeLooseText, parseDateKey, parseKrwAmount } from "./shinhan-normalizers";

const amountPattern = /(\d[\d,]*)\s*원/;
const timePattern = /\b\d{1,2}:\d{2}\b/g;
const dateTextPattern = /(\d{4}[년.\-/\s]+\d{1,2}[월.\-/\s]+\d{1,2}|\d{2,4}[.\-/]\d{1,2}[.\-/]\d{1,2}|\d{1,2}[.\-/]\d{1,2}|\d{8})/g;

export function parseShinhanNotificationText(text: string): ShinhanParsedCandidate[] {
  return splitNotificationBlocks(text)
    .map((block, index) => toNotificationCandidate(block, index))
    .filter((candidate): candidate is ShinhanParsedCandidate => candidate !== null);
}

function toNotificationCandidate(block: string, index: number): ShinhanParsedCandidate | null {
  const rawText = normalizeLooseText(block);
  const amountMatch = rawText.match(amountPattern);
  const amount = parseKrwAmount(amountMatch?.[1] ?? rawText);
  const date = parseDateKey(rawText) ?? todayKey();
  const statusText = extractStatusText(rawText);
  const type = detectTransactionType(statusText, rawText);
  const merchant = extractMerchant(rawText, amountMatch?.[0] ?? "");

  if (!amount || !merchant) {
    return {
      id: `notification-invalid-${index}`,
      kind: "notification",
      date,
      type,
      amount: amount ?? 0,
      merchant,
      statusText,
      approvalNo: "",
      cardName: extractCardName(rawText),
      institutionName: "신한카드",
      transactionSource: "shinhan-notification",
      rawText,
      note: "금액 또는 가맹점 후보를 찾지 못했습니다.",
    } satisfies ShinhanParsedCandidate;
  }

  return {
    id: `notification-${date}-${amount}-${index}`,
    kind: "notification",
    date,
    type,
    amount,
    merchant,
    statusText,
    approvalNo: "",
    cardName: extractCardName(rawText),
    institutionName: "신한카드",
    transactionSource: "shinhan-notification",
    rawText,
    note: parseDateKey(rawText) ? undefined : "날짜가 없어 오늘 날짜로 처리.",
  } satisfies ShinhanParsedCandidate;
}

function splitNotificationBlocks(text: string) {
  const normalized = text.replace(/\r/g, "\n").trim();
  if (!normalized) return [];

  const paragraphBlocks = normalized.split(/\n{2,}/).map((block) => block.trim()).filter(Boolean);
  if (paragraphBlocks.length > 1) return paragraphBlocks;

  const lines = normalized.split("\n").map((line) => line.trim()).filter(Boolean);
  const amountLineCount = lines.filter((line) => amountPattern.test(line)).length;

  return amountLineCount > 1 ? lines : [normalized];
}

function extractStatusText(text: string) {
  if (/승인\s*취소|매출\s*취소|취소/.test(text)) return "승인취소";
  if (/승인/.test(text)) return "승인";
  if (/이용|사용/.test(text)) return "사용";
  return "";
}

function extractCardName(text: string) {
  const maskedCard = text.match(/(?:카드|신한카드|신한체크)[^\d]*(\d{4})/);
  return maskedCard?.[1] ? `끝자리 ${maskedCard[1]}` : "";
}

function extractMerchant(text: string, amountText: string) {
  const cleaned = text
    .replace(/\[[^\]]+\]/g, " ")
    .replace(dateTextPattern, " ")
    .replace(timePattern, " ")
    .replace(amountText, " ")
    .replace(/신한\s*(카드|체크|SOL페이|플레이)?/gi, " ")
    .replace(/승인\s*취소|매출\s*취소|승인취소|취소|승인|사용|이용|일시불|할부|누적|잔액|원화|KRW/gi, " ")
    .replace(/카드\s*끝자리\s*\d{4}/gi, " ")
    .replace(/\d{2,}/g, " ")
    .replace(/[(){}\[\],.]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return cleaned.slice(0, 80);
}

function todayKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}
