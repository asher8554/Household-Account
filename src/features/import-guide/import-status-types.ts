// 카드 파일 로드 상태 저장에 쓰는 타입을 정의합니다.
import type { TransactionSource } from "../transactions/transaction-types";

export type CardImportSource = Extract<TransactionSource, "shinhan-file" | "hyundai-card-file">;

export type CardImportStatus = {
  source: CardImportSource;
  lastLoadedAt: string;
  lastFileName: string;
  lastCandidateCount: number;
  lastReadyCount: number;
  lastDuplicateCount: number;
  lastInvalidCount: number;
  createdAt: string;
  updatedAt: string;
};
