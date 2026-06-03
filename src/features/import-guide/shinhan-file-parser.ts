// 신한카드 CSV, xlsx, HTML/XML xls 파일을 거래 후보로 변환합니다.
import type { ShinhanParsedCandidate } from "./shinhan-import-types";
import { detectTransactionType, normalizeLooseText, parseDateKey, parseKrwAmount } from "./shinhan-normalizers";

type CellValue = string | number | boolean | Date | null;
type TextEncoding = "utf-8" | "euc-kr" | "utf-16le" | "utf-16be";

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

  if (lowerName.endsWith(".xls")) {
    return readLegacyXlsRows(file);
  }

  if (lowerName.endsWith(".csv") || lowerName.endsWith(".tsv") || lowerName.endsWith(".txt")) {
    const text = await decodeTextFile(file);
    return parseDelimitedText(text);
  }

  throw new Error("CSV, TSV, TXT, xls, xlsx 파일만 지원합니다.");
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

async function readLegacyXlsRows(file: File): Promise<CellValue[][]> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);

  if (isCompoundBinaryFile(bytes)) {
    const { parseBinaryXlsWorkbook } = await import("./shinhan-binary-xls-parser");
    return parseBinaryXlsWorkbook(bytes);
  }

  const text = decodeBytes(bytes);
  const lowerText = text.slice(0, 1000).toLowerCase();

  if (lowerText.includes("<html") || lowerText.includes("<table")) {
    return parseHtmlWorkbook(text);
  }

  if (lowerText.includes("<workbook") || lowerText.includes("urn:schemas-microsoft-com:office:spreadsheet")) {
    return parseSpreadsheetXml(text);
  }

  return parseDelimitedText(text);
}

async function decodeTextFile(file: File) {
  return decodeBytes(new Uint8Array(await file.arrayBuffer()));
}

function decodeBytes(bytes: Uint8Array) {
  const bomEncoding = detectBomEncoding(bytes);
  if (bomEncoding) return decodeWithEncoding(bytes, bomEncoding);

  const utf8 = decodeWithEncoding(bytes, "utf-8");
  const charset = detectDeclaredCharset(utf8);
  if (charset) return decodeWithEncoding(bytes, charset);

  if (utf8.includes("\uFFFD")) {
    const eucKr = decodeWithEncoding(bytes, "euc-kr");
    if (replacementCount(eucKr) < replacementCount(utf8)) return eucKr;
  }

  return utf8;
}

function parseHtmlWorkbook(html: string): CellValue[][] {
  const document = new DOMParser().parseFromString(html, "text/html");
  const tables = Array.from(document.querySelectorAll("table"));
  if (tables.length === 0) throw new Error("xls 파일 안에서 표를 찾지 못했습니다.");

  return tables.flatMap((table) =>
    Array.from(table.querySelectorAll("tr"))
      .map((row) =>
        Array.from(row.querySelectorAll("th,td")).map((cell) =>
          normalizeLooseText(cell.textContent).replace(/\u00a0/g, " "),
        ),
      )
      .filter((row) => row.some((cell) => cell)),
  );
}

function parseSpreadsheetXml(xmlText: string): CellValue[][] {
  const document = new DOMParser().parseFromString(xmlText, "application/xml");
  if (document.querySelector("parsererror")) {
    throw new Error("xls XML 내용을 해석하지 못했습니다.");
  }

  return getElementsByLocalName(document, "Row")
    .map((row) => {
      const cells: string[] = [];

      getElementsByLocalName(row, "Cell").forEach((cell) => {
        const indexAttribute = cell.getAttribute("ss:Index") ?? cell.getAttribute("Index");
        const targetIndex = indexAttribute ? Number(indexAttribute) - 1 : cells.length;

        while (cells.length < targetIndex) {
          cells.push("");
        }

        cells.push(normalizeLooseText(cell.textContent));
      });

      return cells;
    })
    .filter((row) => row.some((cell) => cell));
}

function getElementsByLocalName(root: ParentNode, localName: string) {
  return Array.from(root.querySelectorAll("*")).filter((element) => element.localName === localName);
}

function detectBomEncoding(bytes: Uint8Array): TextEncoding | null {
  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) return "utf-8";
  if (bytes[0] === 0xff && bytes[1] === 0xfe) return "utf-16le";
  if (bytes[0] === 0xfe && bytes[1] === 0xff) return "utf-16be";
  return null;
}

function detectDeclaredCharset(text: string): TextEncoding | null {
  const match = text.match(/charset=["']?\s*([A-Za-z0-9_-]+)/i);
  const charset = match?.[1]?.toLowerCase();

  if (!charset) return null;
  if (charset.includes("euc-kr") || charset.includes("ks_c_5601") || charset.includes("ksc5601")) return "euc-kr";
  if (charset.includes("utf-16")) return "utf-16le";
  if (charset.includes("utf-8")) return "utf-8";
  return null;
}

function decodeWithEncoding(bytes: Uint8Array, encoding: TextEncoding) {
  try {
    return new TextDecoder(encoding).decode(bytes);
  } catch {
    return new TextDecoder("utf-8").decode(bytes);
  }
}

function replacementCount(text: string) {
  return (text.match(/\uFFFD/g) ?? []).length;
}

function isCompoundBinaryFile(bytes: Uint8Array) {
  return (
    bytes[0] === 0xd0 &&
    bytes[1] === 0xcf &&
    bytes[2] === 0x11 &&
    bytes[3] === 0xe0 &&
    bytes[4] === 0xa1 &&
    bytes[5] === 0xb1 &&
    bytes[6] === 0x1a &&
    bytes[7] === 0xe1
  );
}

function detectDelimiter(text: string) {
  const firstLine = text.split(/\r?\n/).find((line) => line.trim()) ?? "";
  const candidates = [",", "\t", ";"];

  return candidates
    .map((delimiter) => ({ delimiter, count: firstLine.split(delimiter).length - 1 }))
    .sort((a, b) => b.count - a.count)[0].delimiter;
}
