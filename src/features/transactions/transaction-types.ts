// 거래 도메인 타입과 입력 초안을 정의합니다.
import type { CategoryType } from "../categories/category-types";

export type TransactionSource = "manual" | "csv" | "shinhan-file" | "shinhan-notification" | "bank-file";

export type Transaction = {
  id: string;
  date: string;
  type: CategoryType;
  amount: number;
  categoryId: string;
  memo: string;
  source: TransactionSource;
  createdAt: string;
  updatedAt: string;
};

export type TransactionDraft = {
  date: string;
  type: CategoryType;
  amount: number;
  categoryId: string;
  memo: string;
  source?: TransactionSource;
};
