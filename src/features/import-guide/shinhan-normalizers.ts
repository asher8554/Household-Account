// 신한카드 원본 데이터의 날짜, 금액, 텍스트를 정규화합니다.
import type { CategoryType } from "../categories/category-types";
import { normalizeTransactionMerchantKey } from "../transactions/merchant-key";

const fullDatePatterns = [
  /(?<year>\d{4})[년.\-/\s]+(?<month>\d{1,2})[월.\-/\s]+(?<day>\d{1,2})/,
  /(?<year>\d{2})[.\-/](?<month>\d{1,2})[.\-/](?<day>\d{1,2})/,
  /(?<compact>\d{8})/,
];

const shortDatePattern = /(?<!\d)(?<month>\d{1,2})[.\-/](?<day>\d{1,2})(?!\d)/;

export function normalizeLooseText(value: unknown) {
  return String(value ?? "")
    .replace(/\uFEFF/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeMatchText(value: string) {
  return normalizeTransactionMerchantKey(value);
}

export function parseKrwAmount(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.abs(Math.round(value));
  }

  const text = normalizeLooseText(value);
  if (!/\d/.test(text)) return null;

  const amount = Number(text.replace(/[^\d]/g, ""));
  if (!Number.isFinite(amount) || amount <= 0) return null;

  return amount;
}

export function parseDateKey(value: unknown, fallbackYear = new Date().getFullYear()) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return formatDateParts(value.getFullYear(), value.getMonth() + 1, value.getDate());
  }

  if (typeof value === "number" && Number.isFinite(value) && value > 20000 && value < 80000) {
    const excelEpoch = Date.UTC(1899, 11, 30);
    const parsed = new Date(excelEpoch + value * 86400000);
    return formatDateParts(parsed.getUTCFullYear(), parsed.getUTCMonth() + 1, parsed.getUTCDate());
  }

  const text = normalizeLooseText(value);

  for (const pattern of fullDatePatterns) {
    const match = text.match(pattern);
    if (!match?.groups) continue;

    if (match.groups.compact) {
      const compact = match.groups.compact;
      return formatDateParts(Number(compact.slice(0, 4)), Number(compact.slice(4, 6)), Number(compact.slice(6, 8)));
    }

    const rawYear = Number(match.groups.year);
    const year = rawYear < 100 ? 2000 + rawYear : rawYear;
    return formatDateParts(year, Number(match.groups.month), Number(match.groups.day));
  }

  const shortMatch = text.match(shortDatePattern);
  if (shortMatch?.groups) {
    return formatDateParts(fallbackYear, Number(shortMatch.groups.month), Number(shortMatch.groups.day));
  }

  return null;
}

export function detectTransactionType(statusText: string, rawText: string): CategoryType {
  const text = `${statusText} ${rawText}`;
  if (/승인\s*취소|매출\s*취소|취소|환불|환급|입금|입금액|맡기신|받음|이자/.test(text)) return "income";
  return "expense";
}

export function createMatchKey(type: CategoryType, date: string, amount: number, merchant: string) {
  return [type, date, amount, normalizeMatchText(merchant)].join("|");
}

export function formatImportedMemo({
  merchant,
  statusText,
  approvalNo,
  cardName,
  institutionName,
}: {
  merchant: string;
  statusText: string;
  approvalNo: string;
  cardName: string;
  institutionName?: string;
}) {
  const sourceName = institutionName || "신한카드";
  const details = [
    statusText ? `상태 ${statusText}` : "",
    cardName ? `카드 ${cardName}` : "",
    approvalNo ? `승인번호 ${approvalNo}` : "",
  ].filter(Boolean);

  return details.length > 0 ? `[${sourceName}] ${merchant} / ${details.join(" / ")}` : `[${sourceName}] ${merchant}`;
}

function formatDateParts(year: number, month: number, day: number) {
  if (!isValidDateParts(year, month, day)) return null;

  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function isValidDateParts(year: number, month: number, day: number) {
  if (year < 2000 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) return false;

  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}
