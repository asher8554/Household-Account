// 신한카드 가져오기 후보와 미리보기 상태 타입을 정의합니다.
import type { CategoryType } from "../categories/category-types";

export type ShinhanImportKind = "file" | "notification";

export type ShinhanParsedCandidate = {
  id: string;
  kind: ShinhanImportKind;
  date: string;
  type: CategoryType;
  amount: number;
  merchant: string;
  statusText: string;
  approvalNo: string;
  cardName: string;
  rawText: string;
  note?: string;
};

export type ShinhanPreviewStatus = "ready" | "duplicate" | "invalid";

export type ShinhanPreviewItem = ShinhanParsedCandidate & {
  matchKey: string;
  previewStatus: ShinhanPreviewStatus;
  reason: string;
};

export type ShinhanImportResult = {
  total: number;
  ready: number;
  duplicate: number;
  invalid: number;
};
