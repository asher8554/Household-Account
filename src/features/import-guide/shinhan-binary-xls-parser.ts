// 바이너리 BIFF xls에서 신한카드 행 데이터를 추출합니다.
import * as CFB from "cfb";

type BinaryXlsCell = string | number | boolean | Date | null;

type BiffRecord = {
  id: number;
  data: Uint8Array;
  offset: number;
};

type SstSegment = {
  data: Uint8Array;
};

const recordIds = {
  bof: 0x0809,
  eof: 0x000a,
  codepage: 0x0042,
  sst: 0x00fc,
  continue: 0x003c,
  labelSst: 0x00fd,
  label: 0x0204,
  number: 0x0203,
  rk: 0x027e,
  mulRk: 0x00bd,
  formula: 0x0006,
  boolErr: 0x0205,
};

const worksheetSubstreamType = 0x0010;

export function parseBinaryXlsWorkbook(fileBytes: Uint8Array): BinaryXlsCell[][] {
  const workbook = extractWorkbookStream(fileBytes);
  const records = parseRecords(workbook);
  const codepage = findCodepage(records);
  const sharedStrings = parseSharedStrings(records, codepage);
  const rows = parseFirstWorksheetRows(records, sharedStrings, codepage);

  if (rows.length === 0) {
    throw new Error("바이너리 xls 파일에서 거래 표를 찾지 못했습니다.");
  }

  return rows;
}

function extractWorkbookStream(fileBytes: Uint8Array) {
  const container = CFB.read(fileBytes, { type: "array" });
  const entry =
    CFB.find(container, "Workbook") ??
    CFB.find(container, "Book") ??
    container.FileIndex.find((file) => file.name === "Workbook" || file.name === "Book");

  if (!entry?.content) {
    throw new Error("xls 파일 안에서 Workbook 스트림을 찾지 못했습니다.");
  }

  return toUint8Array(entry.content);
}

function parseRecords(workbook: Uint8Array): BiffRecord[] {
  const records: BiffRecord[] = [];
  let offset = 0;

  while (offset + 4 <= workbook.length) {
    const id = readUInt16(workbook, offset);
    const length = readUInt16(workbook, offset + 2);
    const dataStart = offset + 4;
    const dataEnd = dataStart + length;

    if (dataEnd > workbook.length) {
      throw new Error("xls 레코드 길이가 올바르지 않습니다.");
    }

    records.push({
      id,
      data: workbook.subarray(dataStart, dataEnd),
      offset,
    });
    offset = dataEnd;
  }

  return records;
}

function parseSharedStrings(records: BiffRecord[], codepage: number) {
  const sstIndex = records.findIndex((record) => record.id === recordIds.sst);
  if (sstIndex < 0) return [];
  if (records[sstIndex].data.length < 8) return [];

  const segments: SstSegment[] = [{ data: records[sstIndex].data.subarray(8) }];
  for (let index = sstIndex + 1; records[index]?.id === recordIds.continue; index += 1) {
    segments.push({ data: records[index].data });
  }

  const uniqueCount = readUInt32(records[sstIndex].data, 4);
  const reader = new SstReader(segments);
  const strings: string[] = [];

  for (let index = 0; index < uniqueCount && reader.hasData(); index += 1) {
    strings.push(readSstString(reader, codepage));
  }

  return strings;
}

function parseFirstWorksheetRows(records: BiffRecord[], sharedStrings: string[], codepage: number) {
  const rows: BinaryXlsCell[][] = [];
  let inWorksheet = false;

  for (const record of records) {
    if (record.id === recordIds.bof) {
      inWorksheet = record.data.length >= 4 && readUInt16(record.data, 2) === worksheetSubstreamType;
      continue;
    }

    if (!inWorksheet) continue;
    if (record.id === recordIds.eof) break;

    parseCellRecord(record, rows, sharedStrings, codepage);
  }

  return compactRows(rows);
}

function parseCellRecord(
  record: BiffRecord,
  rows: BinaryXlsCell[][],
  sharedStrings: string[],
  codepage: number,
) {
  if (record.id === recordIds.labelSst && record.data.length >= 10) {
    const row = readUInt16(record.data, 0);
    const column = readUInt16(record.data, 2);
    const stringIndex = readUInt32(record.data, 6);
    setCell(rows, row, column, sharedStrings[stringIndex] ?? "");
    return;
  }

  if (record.id === recordIds.number && record.data.length >= 14) {
    setCell(rows, readUInt16(record.data, 0), readUInt16(record.data, 2), readFloat64(record.data, 6));
    return;
  }

  if (record.id === recordIds.rk && record.data.length >= 10) {
    setCell(rows, readUInt16(record.data, 0), readUInt16(record.data, 2), decodeRkNumber(readUInt32(record.data, 6)));
    return;
  }

  if (record.id === recordIds.mulRk && record.data.length >= 10) {
    parseMulRkRecord(record.data, rows);
    return;
  }

  if (record.id === recordIds.label && record.data.length >= 8) {
    const result = readBiffString(record.data, 6, codepage);
    setCell(rows, readUInt16(record.data, 0), readUInt16(record.data, 2), result.text);
    return;
  }

  if (record.id === recordIds.formula && record.data.length >= 14) {
    const value = readFormulaNumber(record.data);
    if (value !== null) {
      setCell(rows, readUInt16(record.data, 0), readUInt16(record.data, 2), value);
    }
    return;
  }

  if (record.id === recordIds.boolErr && record.data.length >= 8 && record.data[7] === 0) {
    setCell(rows, readUInt16(record.data, 0), readUInt16(record.data, 2), record.data[6] === 1);
  }
}

function parseMulRkRecord(data: Uint8Array, rows: BinaryXlsCell[][]) {
  const row = readUInt16(data, 0);
  const firstColumn = readUInt16(data, 2);
  const lastColumn = readUInt16(data, data.length - 2);
  let offset = 4;

  for (let column = firstColumn; column <= lastColumn && offset + 6 <= data.length - 2; column += 1) {
    const rkValue = readUInt32(data, offset + 2);
    setCell(rows, row, column, decodeRkNumber(rkValue));
    offset += 6;
  }
}

class SstReader {
  private segmentIndex = 0;
  private offset = 0;

  constructor(private readonly segments: SstSegment[]) {}

  hasData() {
    for (let index = this.segmentIndex; index < this.segments.length; index += 1) {
      const offset = index === this.segmentIndex ? this.offset : 0;
      if (offset < this.segments[index].data.length) return true;
    }

    return false;
  }

  readByte() {
    while (this.remainingInSegment() === 0) {
      if (!this.currentSegment()) {
        throw new Error("xls 공유 문자열 데이터가 예상보다 짧습니다.");
      }

      this.moveToNextSegment();
    }

    const segment = this.currentSegment();
    if (!segment) {
      throw new Error("xls 공유 문자열 데이터가 예상보다 짧습니다.");
    }

    return segment.data[this.offset++];
  }

  readUInt16() {
    const bytes = this.readBytes(2);
    return readUInt16(bytes, 0);
  }

  readUInt32() {
    const bytes = this.readBytes(4);
    return readUInt32(bytes, 0);
  }

  readText(characterCount: number, isWide: boolean, codepage: number) {
    let text = "";
    let remainingCharacters = characterCount;
    let currentIsWide = isWide;

    while (remainingCharacters > 0) {
      if (this.remainingInSegment() === 0) {
        currentIsWide = this.readContinuationStringFlags();
        continue;
      }

      const bytesPerCharacter = currentIsWide ? 2 : 1;
      const availableCharacters = Math.floor(this.remainingInSegment() / bytesPerCharacter);

      if (availableCharacters === 0) {
        const firstByte = this.readCurrentSegmentBytes(1);
        currentIsWide = this.readContinuationStringFlags();
        const secondByte = this.readCurrentSegmentBytes(1);
        text += decodeStringBytes(new Uint8Array([firstByte[0], secondByte[0]]), true, codepage);
        remainingCharacters -= 1;
        continue;
      }

      const charactersToRead = Math.min(remainingCharacters, availableCharacters);
      const textBytes = this.readCurrentSegmentBytes(charactersToRead * bytesPerCharacter);
      text += decodeStringBytes(textBytes, currentIsWide, codepage);
      remainingCharacters -= charactersToRead;
    }

    return text;
  }

  skipBytes(length: number) {
    this.readBytes(length);
  }

  private readBytes(length: number) {
    const result = new Uint8Array(length);
    let written = 0;

    while (written < length) {
      if (this.remainingInSegment() === 0) {
        if (!this.currentSegment()) {
          throw new Error("xls 공유 문자열 데이터가 예상보다 짧습니다.");
        }

        this.moveToNextSegment();
        continue;
      }

      const bytesToRead = Math.min(length - written, this.remainingInSegment());
      result.set(this.readCurrentSegmentBytes(bytesToRead), written);
      written += bytesToRead;
    }

    return result;
  }

  private readCurrentSegmentBytes(length: number) {
    const segment = this.currentSegment();
    if (!segment || this.remainingInSegment() < length) {
      throw new Error("xls 공유 문자열 데이터가 예상보다 짧습니다.");
    }

    const bytes = segment.data.subarray(this.offset, this.offset + length);
    this.offset += length;
    return bytes;
  }

  private readContinuationStringFlags() {
    this.moveToNextSegment();
    return (this.readByte() & 0x01) === 0x01;
  }

  private currentSegment() {
    return this.segments[this.segmentIndex];
  }

  private remainingInSegment() {
    const segment = this.currentSegment();
    return segment ? segment.data.length - this.offset : 0;
  }

  private moveToNextSegment() {
    this.segmentIndex += 1;
    this.offset = 0;
  }
}

function readSstString(reader: SstReader, codepage: number) {
  const characterCount = reader.readUInt16();
  const flags = reader.readByte();

  const isWide = (flags & 0x01) === 0x01;
  const hasExtendedData = (flags & 0x04) === 0x04;
  const hasRichText = (flags & 0x08) === 0x08;
  let richTextRunCount = 0;
  let extendedDataSize = 0;

  if (hasRichText) {
    richTextRunCount = reader.readUInt16();
  }

  if (hasExtendedData) {
    extendedDataSize = reader.readUInt32();
  }

  const text = reader.readText(characterCount, isWide, codepage);

  if (hasRichText) reader.skipBytes(richTextRunCount * 4);
  if (hasExtendedData) reader.skipBytes(extendedDataSize);

  return text;
}

function readBiffString(data: Uint8Array, offset: number, codepage: number) {
  const characterCount = readUInt16(data, offset);
  let cursor = offset + 2;
  const flags = data[cursor];
  cursor += 1;

  const isWide = (flags & 0x01) === 0x01;
  const hasExtendedData = (flags & 0x04) === 0x04;
  const hasRichText = (flags & 0x08) === 0x08;
  let richTextRunCount = 0;
  let extendedDataSize = 0;

  if (hasRichText) {
    richTextRunCount = readUInt16(data, cursor);
    cursor += 2;
  }

  if (hasExtendedData) {
    extendedDataSize = readUInt32(data, cursor);
    cursor += 4;
  }

  const byteLength = characterCount * (isWide ? 2 : 1);
  const textBytes = data.subarray(cursor, cursor + byteLength);
  cursor += byteLength;

  if (hasRichText) cursor += richTextRunCount * 4;
  if (hasExtendedData) cursor += extendedDataSize;

  return {
    text: decodeStringBytes(textBytes, isWide, codepage),
    offset: cursor,
  };
}

function decodeStringBytes(bytes: Uint8Array, isWide: boolean, codepage: number) {
  const encoding = isWide ? "utf-16le" : singleByteEncodingForCodepage(codepage);

  try {
    return new TextDecoder(encoding).decode(bytes).replace(/\0+$/g, "");
  } catch {
    return new TextDecoder("windows-1252").decode(bytes).replace(/\0+$/g, "");
  }
}

function singleByteEncodingForCodepage(codepage: number) {
  if (codepage === 949 || codepage === 1361) return "euc-kr";
  if (codepage === 65001) return "utf-8";
  return "windows-1252";
}

function findCodepage(records: BiffRecord[]) {
  const codepageRecord = records.find((record) => record.id === recordIds.codepage && record.data.length >= 2);
  return codepageRecord ? readUInt16(codepageRecord.data, 0) : 1252;
}

function setCell(rows: BinaryXlsCell[][], rowIndex: number, columnIndex: number, value: BinaryXlsCell) {
  rows[rowIndex] ??= [];
  rows[rowIndex][columnIndex] = value;
}

function compactRows(rows: BinaryXlsCell[][]) {
  return rows
    .filter(Boolean)
    .map((row) => Array.from({ length: row.length }, (_, index) => row[index] ?? ""))
    .filter((row) => row.some((cell) => String(cell ?? "").trim()));
}

function decodeRkNumber(rawValue: number) {
  const isMultipliedBy100 = (rawValue & 0x01) === 0x01;
  const isInteger = (rawValue & 0x02) === 0x02;
  let value: number;

  if (isInteger) {
    value = signedRightShift(rawValue, 2);
  } else {
    const buffer = new Uint8Array(8);
    const view = new DataView(buffer.buffer);
    view.setUint32(4, rawValue & 0xfffffffc, true);
    value = view.getFloat64(0, true);
  }

  return isMultipliedBy100 ? value / 100 : value;
}

function readFormulaNumber(data: Uint8Array) {
  if (data[12] === 0xff && data[13] === 0xff) return null;
  return readFloat64(data, 6);
}

function signedRightShift(value: number, bits: number) {
  return value >> bits;
}

function readUInt16(data: Uint8Array, offset: number) {
  return new DataView(data.buffer, data.byteOffset, data.byteLength).getUint16(offset, true);
}

function readUInt32(data: Uint8Array, offset: number) {
  return new DataView(data.buffer, data.byteOffset, data.byteLength).getUint32(offset, true);
}

function readFloat64(data: Uint8Array, offset: number) {
  return new DataView(data.buffer, data.byteOffset, data.byteLength).getFloat64(offset, true);
}

function toUint8Array(data: CFB.CFB$Blob) {
  return data instanceof Uint8Array ? data : new Uint8Array(data);
}
