// 파서 힌트 적용 시 파일 파서 동작을 검증합니다.
import { expect, test } from "@playwright/test";
import { parseShinhanTransactionFile } from "../src/features/import-guide/shinhan-file-parser";

test("parseShinhanTransactionFile uses supplied column hints", async () => {
  const file = new File(["정산일,청구액,매장\n2026-06-01,12000,스타벅스"], "hint-only.csv", {
    type: "text/csv",
  });

  const candidates = await parseShinhanTransactionFile(file, {
    parserKey: "shinhan-card",
    institutionName: "신한카드",
    dateColumnHints: ["정산일"],
    amountColumnHints: ["청구액"],
    merchantColumnHints: ["매장"],
    statusColumnHints: [],
  });

  expect(candidates).toHaveLength(1);
  expect(candidates[0]).toMatchObject({
    date: "2026-06-01",
    amount: 12000,
    merchant: "스타벅스",
    institutionName: "신한카드",
    transactionSource: "shinhan-file",
  });
});

test("parseShinhanTransactionFile keeps existing aliases without hints", async () => {
  const file = new File(["이용일자,이용금액,가맹점명\n2026-06-01,12000,스타벅스"], "shinhan.csv", {
    type: "text/csv",
  });

  const candidates = await parseShinhanTransactionFile(file);

  expect(candidates).toHaveLength(1);
  expect(candidates[0]).toMatchObject({
    date: "2026-06-01",
    amount: 12000,
    merchant: "스타벅스",
    institutionName: "신한카드",
    transactionSource: "shinhan-file",
  });
});

test("parseShinhanTransactionFile uses Naver Pay parser hints", async () => {
  const file = new File(['날짜,시간,항목,금액,유형\n2026.06.01,13:22,스타벅스,"-5,400원",결제'], "naver-pay.csv", {
    type: "text/csv",
  });

  const candidates = await parseShinhanTransactionFile(file, {
    parserKey: "naver-pay",
    institutionName: "네이버페이",
    dateColumnHints: ["날짜"],
    amountColumnHints: ["금액"],
    merchantColumnHints: ["항목"],
    statusColumnHints: ["유형"],
  });

  expect(candidates).toHaveLength(1);
  expect(candidates[0]).toMatchObject({
    date: "2026-06-01",
    type: "expense",
    amount: 5400,
    merchant: "스타벅스",
    statusText: "결제",
    institutionName: "네이버페이",
    transactionSource: "naver-pay-file",
  });
});
