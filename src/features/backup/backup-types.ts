// JSON 백업 파일과 가져오기 결과 타입을 정의합니다.
import type { Category } from "../categories/category-types";
import type { Transaction } from "../transactions/transaction-types";

export type BackupFile = {
  version: 1;
  exportedAt: string;
  categories: Category[];
  transactions: Transaction[];
};

export type ImportSummary = {
  categoriesAdded: number;
  categoriesUpdated: number;
  transactionsAdded: number;
  transactionsUpdated: number;
  transactionsSkipped: number;
};

export type ReplaceSummary = {
  exportedAt: string;
  categoriesReplaced: number;
  transactionsReplaced: number;
};
