// 카테고리 도메인 타입을 정의합니다.
export type CategoryType = "income" | "expense";

export type Category = {
  id: string;
  type: CategoryType;
  name: string;
  color: string;
  isDefault: boolean;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type CategoryDraft = {
  type: CategoryType;
  name: string;
  color: string;
};
