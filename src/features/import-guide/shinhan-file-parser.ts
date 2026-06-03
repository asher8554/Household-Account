// 신한카드 CSV와 xlsx 파일을 거래 후보로 변환합니다.
import type { ShinhanParsedCandidate } from "./shinhan-import-types";
import { detectTransactionType, normalizeLooseText, parseDateKey, parseKrwAmount } from "./shinhan-normalizers";

type CellValue = string | number | boolean | Date | null;

const columnAliases = {
  date: ["이용일자", "승인일자", "거래일자", "매출일자", "일자", "사용일자"],
  amount: ["이용금액", "승인금액", "거래금액", "매출금액", "결제금액", "청구금액", "원화금액", "금액"],
  merchant: ["가맹점명", "이용가맹점", "가맹점", "사용처", "상호", "내용", "적요"],
  status: ["승인상태", "상태", "거래상태", "구분", "승인구분", "매출구분"],
  approvalNo: ["승인번호", "승인No", "승인NO", "승인 NO", "승인코드"],
  cardName: ["카드명", "카드번호", "카드", "이용카드"],
};

type ColumnMapping = {
  date: number;
  amount: number;
  merchant: number;
  status: number;
  approvalNo: number;
  cardName: number;
};

export async function parseShinhanTransactionFile(file: File): Promise<ShinhanParsedCandidate[]> {
  const rows = await readFileRows(file);
  const table = rows.filter((row) => row.some((cell) => normalizeLooseText(cell)));
  const headerIndex = findHeaderRowIndex(table);

  if (headerIndex < 0) {
    throw new Error("이용일자, 이용금액, 가맹점명 같은 헤더 행을 찾지 못했습니다.");
  }

  const headers = table[headerIndex].map((cell) => normalizeLooseText(cell));
  const mapping = buildColumnMapping(headers);

  if (mapping.date < 0 || mapping.amount < 0 || mapping.merchant < 0) {
    throw new Error("날짜, 금액, 가맹점명 컬럼을 자동으로 찾지 못했습니다.");
  }

  return table
    .slice(headerIndex + 1)
    .map((row, index) => toCandidate(row, mapping, index))
    .filter((candidate): candidate is ShinhanParsedCandidate => candidate !== null);
}

async function readFileRows(file: File): Promise<CellValue[][]> {
  const lowerName = file.name.toLowerCase();

  if (lowerName.endsWith(".xlsx")) {
    const { default: readXlsxFile } = await import("read-excel-file");
    return readXlsxFile(file) as Promise<CellValue[][]>;
  }

  if (lowerName.endsWith(".csv") || lowerName.endsWith(".tsv") || lowerName.endsWith(".txt")) {
    const text = await file.text();
    return parseDelimitedText(text);
  }

  throw new Error("CSV, TSV, TXT, xlsx 파일만 지원합니다. xls 파일은 CSV 또는 xlsx로 다시 저장해 주세요.");
}

function toCandidate(row: CellValue[], mapping: ColumnMapping, index: number): ShinhanParsedCandidate | null {
  const date = parseDateKey(row[mapping.date]);
  const amount = parseKrwAmount(row[mapping.amount]);
  const merchant = normalizeLooseText(row[mapping.merchant]);
  const statusText = getOptionalCell(row, mapping.status);
  const approvalNo = getOptionalCell(row, mapping.approvalNo);
  const cardName = getOptionalCell(row, mapping.cardName);
  const rawText = row.map((cell) => normalizeLooseText(cell)).filter(Boolean).join(" ");
  const type = detectTransactionType(statusText, rawText);

  if (!date || !amount || !merchant) {
    return {
      id: `file-invalid-${index}`,
      kind: "file",
      date: date ?? "",
      type,
      amount: amount ?? 0,
      merchant,
      statusText,
      approvalNo,
      cardName,
      rawText,
      note: "필수값 누락.",
    } satisfies ShinhanParsedCandidate;
  }

  return {
    id: `file-${date}-${amount}-${index}`,
    kind: "file",
    date,
    type,
    amount,
    merchant,
    statusText,
    approvalNo,
    cardName,
    rawText,
  } satisfies ShinhanParsedCandidate;
}

function getOptionalCell(row: CellValue[], index: number) {
  return index >= 0 ? normalizeLooseText(row[index]) : "";
}

function buildColumnMapping(headers: string[]): ColumnMapping {
  return {
    date: findColumnIndex(headers, columnAliases.date),
    amount: findColumnIndex(headers, columnAliases.amount),
    merchant: findColumnIndex(headers, columnAliases.merchant),
    status: findColumnIndex(headers, columnAliases.status),
    approvalNo: findColumnIndex(headers, columnAliases.approvalNo),
    cardName: findColumnIndex(headers, columnAliases.cardName),
  };
}

function findHeaderRowIndex(rows: CellValue[][]) {
  let bestIndex = -1;
  let bestScore = 0;

  rows.slice(0, 12).forEach((row, index) => {
    const headers = row.map((cell) => normalizeLooseText(cell));
    const mapping = buildColumnMapping(headers);
    const score = Number(mapping.date >= 0) + Number(mapping.amount >= 0) + Number(mapping.merchant >= 0);

    if (score > bestScore) {
      bestScore = score;
      bestIndex = index;
    }
  });

  return bestScore >= 2 ? bestIndex : -1;
}

function findColumnIndex(headers: string[], aliases: string[]) {
  const normalizedAliases = aliases.map(normalizeHeader);

  return headers.findIndex((header) => {
    const normalizedHeader = normalizeHeader(header);
    return normalizedAliases.some((alias) => normalizedHeader.includes(alias));
  });
}

function normalizeHeader(value: string) {
  return value.replace(/[\s()[\]{}_\-/:：]/g, "").toLowerCase();
}

function parseDelimitedText(rawText: string): string[][] {
  const text = rawText.replace(/^\uFEFF/, "");
  const delimiter = detectDelimiter(text);
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === "\"") {
      if (inQuotes && next === "\"") {
        field += "\"";
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (!inQuotes && char === delimiter) {
      row.push(field.trim());
      field = "";
      continue;
    }

    if (!inQuotes && (char === "\n" || char === "\r")) {
      if (char === "\r" && next === "\n") {
        index += 1;
      }
      row.push(field.trim());
      rows.push(row);
      row = [];
      field = "";
      continue;
    }

    field += char;
  }

  row.push(field.trim());
  rows.push(row);

  return rows.filter((cells) => cells.some((cell) => cell));
}

function detectDelimiter(text: string) {
  const firstLine = text.split(/\r?\n/).find((line) => line.trim()) ?? "";
  const candidates = [",", "\t", ";"];

  return candidates
    .map((delimiter) => ({ delimiter, count: firstLine.split(delimiter).length - 1 }))
    .sort((a, b) => b.count - a.count)[0].delimiter;
}
