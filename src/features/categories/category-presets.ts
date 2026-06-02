// 기본 수입/지출 카테고리 프리셋을 제공합니다.
import type { Category, CategoryType } from "./category-types";

type Preset = {
  id: string;
  type: CategoryType;
  name: string;
  color: string;
};

const presets: Preset[] = [
  { id: "expense-food", type: "expense", name: "식비", color: "#c85645" },
  { id: "expense-cafe", type: "expense", name: "카페", color: "#d49a2d" },
  { id: "expense-transport", type: "expense", name: "교통", color: "#4b7a9f" },
  { id: "expense-grocery", type: "expense", name: "장보기", color: "#476b53" },
  { id: "expense-household", type: "expense", name: "생활용품", color: "#7a6a4b" },
  { id: "expense-housing", type: "expense", name: "주거/관리비", color: "#7b5d8d" },
  { id: "expense-telecom", type: "expense", name: "통신", color: "#2f8f7a" },
  { id: "expense-insurance", type: "expense", name: "보험", color: "#596a98" },
  { id: "expense-medical", type: "expense", name: "의료", color: "#b3566a" },
  { id: "expense-shopping", type: "expense", name: "쇼핑", color: "#9b5e3c" },
  { id: "expense-leisure", type: "expense", name: "문화/여가", color: "#61734d" },
  { id: "expense-subscription", type: "expense", name: "구독", color: "#8b6f47" },
  { id: "expense-other", type: "expense", name: "기타", color: "#6d746a" },
  { id: "income-salary", type: "income", name: "급여", color: "#2f8f7a" },
  { id: "income-side", type: "income", name: "부수입", color: "#476b53" },
  { id: "income-refund", type: "income", name: "환급", color: "#4b7a9f" },
  { id: "income-other", type: "income", name: "기타수입", color: "#6d746a" },
];

export function createDefaultCategories(now: string): Category[] {
  return presets.map((preset, index) => ({
    ...preset,
    isDefault: true,
    isActive: true,
    sortOrder: index,
    createdAt: now,
    updatedAt: now,
  }));
}

export function getFallbackCategoryId(type: CategoryType) {
  return type === "income" ? "income-other" : "expense-other";
}
