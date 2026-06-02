// 카테고리 추가, 수정, 비활성화 UI를 제공합니다.
import { FormEvent, useState } from "react";
import { Check, Pencil, RotateCcw, Trash2, X } from "lucide-react";
import { cx } from "../../lib/cx";
import { Button } from "../../shared/ui/Button";
import { FormField } from "../../shared/ui/FormField";
import { SectionPanel } from "../../shared/ui/SectionPanel";
import { getFallbackCategoryId } from "./category-presets";
import { addCategory, deactivateCategory, restoreCategory, updateCategory } from "./category-service";
import type { Category, CategoryType } from "./category-types";

type CategoryManagerProps = {
  categories: Category[];
};

type EditDraft = {
  id: string;
  name: string;
  color: string;
};

export function CategoryManager({ categories }: CategoryManagerProps) {
  const [newType, setNewType] = useState<CategoryType>("expense");
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("#476b53");
  const [editDraft, setEditDraft] = useState<EditDraft | null>(null);
  const [message, setMessage] = useState("");

  const active = categories.filter((category) => category.isActive);
  const inactive = categories.filter((category) => !category.isActive);

  async function handleAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!newName.trim()) {
      setMessage("카테고리 이름을 입력하세요.");
      return;
    }

    await addCategory({
      type: newType,
      name: newName,
      color: newColor,
    });
    setNewName("");
    setMessage("카테고리를 추가했습니다.");
  }

  async function handleSaveEdit() {
    if (!editDraft?.name.trim()) {
      setMessage("카테고리 이름을 입력하세요.");
      return;
    }

    await updateCategory(editDraft.id, {
      name: editDraft.name,
      color: editDraft.color,
    });
    setEditDraft(null);
    setMessage("카테고리를 수정했습니다.");
  }

  return (
    <SectionPanel title="카테고리" eyebrow="관리">
      <form onSubmit={handleAdd} className="grid gap-2">
        <div className="grid grid-cols-[1fr_1fr_48px] gap-2">
          <select
            className="h-10 rounded-lg border border-line bg-field px-3 text-sm"
            value={newType}
            onChange={(event) => setNewType(event.target.value as CategoryType)}
          >
            <option value="expense">지출</option>
            <option value="income">수입</option>
          </select>
          <input
            className="h-10 rounded-lg border border-line bg-field px-3 text-sm"
            placeholder="이름"
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
          />
          <FormField label="">
            <input
              className="h-10 w-full rounded-lg border border-line bg-field p-1"
              type="color"
              value={newColor}
              title="카테고리 색상"
              onChange={(event) => setNewColor(event.target.value)}
            />
          </FormField>
        </div>
        <Button type="submit" variant="secondary" size="sm">
          추가
        </Button>
      </form>

      <div className="mt-4 grid max-h-80 gap-2 overflow-auto pr-1">
        {active.map((category) => {
          const isEditing = editDraft?.id === category.id;
          const isFallback = category.id === getFallbackCategoryId(category.type);

          return (
            <div
              key={category.id}
              className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-lg border border-line px-3 py-2"
            >
              {isEditing ? (
                <div className="grid grid-cols-[minmax(0,1fr)_42px] gap-2">
                  <input
                    className="h-9 rounded-lg border border-line bg-field px-2 text-sm"
                    value={editDraft.name}
                    onChange={(event) => setEditDraft({ ...editDraft, name: event.target.value })}
                  />
                  <input
                    className="h-9 w-full rounded-lg border border-line bg-field p-1"
                    type="color"
                    value={editDraft.color}
                    title="카테고리 색상"
                    onChange={(event) => setEditDraft({ ...editDraft, color: event.target.value })}
                  />
                </div>
              ) : (
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-3 w-3 shrink-0 rounded-full"
                      style={{ backgroundColor: category.color }}
                    />
                    <span className="truncate text-sm font-medium">{category.name}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-muted">
                    {category.type === "expense" ? "지출" : "수입"}
                  </p>
                </div>
              )}

              <div className="flex items-center gap-1">
                {isEditing ? (
                  <>
                    <Button size="sm" variant="ghost" onClick={handleSaveEdit} aria-label="저장" title="저장">
                      <Check size={16} aria-hidden="true" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditDraft(null)}
                      aria-label="취소"
                      title="취소"
                    >
                      <X size={16} aria-hidden="true" />
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        setEditDraft({
                          id: category.id,
                          name: category.name,
                          color: category.color,
                        })
                      }
                      aria-label="수정"
                      title="수정"
                    >
                      <Pencil size={16} aria-hidden="true" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className={cx(isFallback && "opacity-40")}
                      disabled={isFallback}
                      onClick={() => void deactivateCategory(category.id)}
                      aria-label="비활성화"
                      title="비활성화"
                    >
                      <Trash2 size={16} aria-hidden="true" />
                    </Button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {inactive.length > 0 ? (
        <div className="mt-4 border-t border-line pt-3">
          <p className="mb-2 text-sm font-medium text-muted">비활성</p>
          <div className="grid gap-2">
            {inactive.map((category) => (
              <div key={category.id} className="flex items-center justify-between gap-2 text-sm text-muted">
                <span>{category.name}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => void restoreCategory(category.id)}
                  aria-label="복원"
                  title="복원"
                >
                  <RotateCcw size={16} aria-hidden="true" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {message ? <p className="mt-3 text-sm text-muted">{message}</p> : null}
    </SectionPanel>
  );
}
