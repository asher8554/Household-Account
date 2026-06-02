// 카테고리 저장, 수정, 비활성화 정책을 캡슐화합니다.
import { db } from "../../db/db";
import { createId } from "../../lib/id";
import { createDefaultCategories, getFallbackCategoryId } from "./category-presets";
import type { Category, CategoryDraft, CategoryType } from "./category-types";

export async function ensureDefaultCategories() {
  const count = await db.categories.count();
  if (count > 0) return;

  await db.categories.bulkPut(createDefaultCategories(new Date().toISOString()));
}

export async function listCategories() {
  return db.categories.orderBy("sortOrder").toArray();
}

export async function addCategory(draft: CategoryDraft) {
  const now = new Date().toISOString();
  const sortOrder = await db.categories.count();
  const category: Category = {
    id: createId("cat"),
    type: draft.type,
    name: draft.name.trim(),
    color: draft.color,
    isDefault: false,
    isActive: true,
    sortOrder,
    createdAt: now,
    updatedAt: now,
  };

  await db.categories.put(category);
  return category;
}

export async function updateCategory(
  id: string,
  patch: Pick<Category, "name" | "color"> & Partial<Pick<Category, "isActive">>,
) {
  await db.categories.update(id, {
    ...patch,
    name: patch.name.trim(),
    updatedAt: new Date().toISOString(),
  });
}

export async function deactivateCategory(id: string) {
  await db.categories.update(id, {
    isActive: false,
    updatedAt: new Date().toISOString(),
  });
}

export async function restoreCategory(id: string) {
  await db.categories.update(id, {
    isActive: true,
    updatedAt: new Date().toISOString(),
  });
}

export async function ensureFallbackCategory(type: CategoryType) {
  const id = getFallbackCategoryId(type);
  const existing = await db.categories.get(id);

  if (existing) {
    if (!existing.isActive) {
      await restoreCategory(id);
    }

    return id;
  }

  const now = new Date().toISOString();
  const [fallback] = createDefaultCategories(now).filter((category) => category.id === id);
  await db.categories.put(fallback);
  return id;
}

export async function resetCategoriesToDefaults() {
  await db.categories.clear();
  await db.categories.bulkPut(createDefaultCategories(new Date().toISOString()));
}
