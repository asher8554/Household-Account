// Notion 기관 설정 정규화 동작을 검증합니다.
import { expect, test } from "@playwright/test";
import { normalizeNotionInstitutionPages } from "../workers/notion-institution-normalizer";

const richText = (plainText: string) => ({
  rich_text: [{ plain_text: plainText }],
});

const title = (plainText: string) => ({
  title: [{ plain_text: plainText }],
});

const select = (name: string) => ({
  select: { name },
});

const multiSelect = (names: string[]) => ({
  multi_select: names.map((name) => ({ name })),
});

test("normalizes a Notion page with guide text, hints, urls, and sort order", () => {
  const fetchedAt = "2026-06-07T10:00:00.000Z";
  const catalog = normalizeNotionInstitutionPages(
    [
      {
        id: "page-kb-card",
        last_edited_time: "2026-06-07T09:00:00.000Z",
        properties: {
          Name: title(" KB 국민카드 "),
          "Institution Type": select("card"),
          Enabled: { checkbox: true },
          "Sort Order": { number: 10 },
          "Parser Key": richText(" kb-card-csv\n"),
          "Homepage URL": { url: " https://card.kbcard.com " },
          "Mobile App URL": { url: " https://apps.apple.com/app/kb-pay " },
          "Supported Formats": multiSelect(["csv", "xlsx"]),
          "Required Columns": multiSelect(["이용일자", "이용금액", "가맹점명"]),
          "Date Column Hints": multiSelect(["이용일자", "승인일"]),
          "Amount Column Hints": multiSelect(["이용금액", "금액"]),
          "Merchant Column Hints": multiSelect(["가맹점명", "사용처"]),
          "Status Column Hints": multiSelect(["상태", "승인상태"]),
          "PC Steps": richText(
            " 1. 홈페이지 접속 \n2. 이용내역 메뉴 선택\r\n\r\n 3. CSV 다운로드 ",
          ),
          "Mobile Steps": richText(
            "1. KB Pay 실행\n\n 2. 카드 이용내역 열기 \n3. 공유로 내보내기",
          ),
          Notes: richText(" 국내 승인 내역만   가져옵니다. "),
        },
      },
    ],
    fetchedAt,
  );
  const jsonOutput = JSON.stringify(catalog);

  expect(jsonOutput).not.toContain("page-kb-card");
  expect(jsonOutput).not.toContain("properties");

  expect(catalog).toEqual({
    version: 1,
    fetchedAt,
    institutions: [
      {
        name: "KB 국민카드",
        institutionType: "card",
        enabled: true,
        sortOrder: 10,
        parserKey: "kb-card-csv",
        homepageUrl: "https://card.kbcard.com",
        mobileAppUrl: "https://apps.apple.com/app/kb-pay",
        supportedFormats: ["csv", "xlsx"],
        requiredColumns: ["이용일자", "이용금액", "가맹점명"],
        dateColumnHints: ["이용일자", "승인일"],
        amountColumnHints: ["이용금액", "금액"],
        merchantColumnHints: ["가맹점명", "사용처"],
        statusColumnHints: ["상태", "승인상태"],
        pcSteps: ["1. 홈페이지 접속", "2. 이용내역 메뉴 선택", "3. CSV 다운로드"],
        mobileSteps: ["1. KB Pay 실행", "2. 카드 이용내역 열기", "3. 공유로 내보내기"],
        notes: "국내 승인 내역만 가져옵니다.",
        updatedAt: "2026-06-07T09:00:00.000Z",
      },
    ],
  });
});

test("filters disabled and nameless entries and sorts enabled entries by order and name", () => {
  const fetchedAt = "2026-06-07T10:00:00.000Z";
  const catalog = normalizeNotionInstitutionPages(
    [
      {
        id: "disabled-bank",
        properties: {
          Name: title("사용 안 함"),
          "Institution Type": select("bank"),
          Enabled: { checkbox: false },
          "Sort Order": { number: 0 },
        },
      },
      {
        id: "nameless-card",
        properties: {
          Name: title(" \n "),
          Enabled: { checkbox: true },
        },
      },
      {
        id: "na-bank",
        last_edited_time: "2026-06-07T08:00:00.000Z",
        properties: {
          Name: title("나은행"),
          "Institution Type": select("bank"),
          Enabled: { checkbox: true },
          "Sort Order": { number: 2 },
        },
      },
      {
        id: "ga-bank",
        properties: {
          Name: title("가은행"),
          "Institution Type": select("credit-union"),
          "Sort Order": { number: 2 },
        },
      },
      {
        id: "toss-pay",
        properties: {
          Name: title("토스페이"),
          "Institution Type": select("pay"),
          "Sort Order": { number: 1 },
        },
      },
    ],
    fetchedAt,
  );

  expect(catalog.institutions.map((institution) => institution.name)).toEqual([
    "토스페이",
    "가은행",
    "나은행",
  ]);
  expect(catalog.institutions[2]).toMatchObject({
    institutionType: "bank",
  });
  expect(catalog.institutions[1]).toMatchObject({
    institutionType: "card",
    enabled: true,
    updatedAt: fetchedAt,
  });
});
