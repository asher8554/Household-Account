// 파서 힌트 적용 시 파일 파서 동작을 검증합니다.
import { expect, test } from "@playwright/test";
import { parseShinhanTransactionFile } from "../src/features/import-guide/shinhan-file-parser";

test("parseShinhanTransactionFile uses supplied column hints", async () => {
  const file = new File(["결제일,결제금액,사용처\n2026-06-01,12000,스타벅스"], "hint-only.csv", {
    type: "text/csv",
  });

  const candidates = await parseShinhanTransactionFile(file, {
    parserKey: "shinhan-card",
    institutionName: "신한카드",
    dateColumnHints: ["결제일"],
    amountColumnHints: ["결제금액"],
    merchantColumnHints: ["사용처"],
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
