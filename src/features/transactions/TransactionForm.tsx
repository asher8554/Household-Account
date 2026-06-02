// 간단 거래 입력 폼을 제공합니다.
import { FormEvent, useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { normalizeAmountInput } from "../../lib/money";
import { Button } from "../../shared/ui/Button";
import { FormField } from "../../shared/ui/FormField";
import type { Category, CategoryType } from "../categories/category-types";
import { addTransaction } from "./transaction-service";

type TransactionFormProps = {
  categories: Category[];
  defaultDateKey: string;
};

export function TransactionForm({ categories, defaultDateKey }: TransactionFormProps) {
  const [date, setDate] = useState(defaultDateKey);
  const [type, setType] = useState<CategoryType>("expense");
  const [amountText, setAmountText] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [memo, setMemo] = useState("");
  const [error, setError] = useState("");

  const activeCategories = useMemo(
    () => categories.filter((category) => category.type === type && category.isActive),
    [categories, type],
  );

  useEffect(() => {
    setDate(defaultDateKey);
  }, [defaultDateKey]);

  useEffect(() => {
    if (activeCategories.some((category) => category.id === categoryId)) return;
    setCategoryId(activeCategories[0]?.id ?? "");
  }, [activeCategories, categoryId]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const amount = normalizeAmountInput(amountText);

    if (!date || !categoryId || amount <= 0) {
      setError("날짜, 금액, 카테고리를 확인하세요.");
      return;
    }

    await addTransaction({
      date,
      type,
      amount,
      categoryId,
      memo,
    });

    setAmountText("");
    setMemo("");
    setError("");
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-3">
      <div className="grid grid-cols-2 gap-2">
        <Button
          variant={type === "expense" ? "primary" : "secondary"}
          onClick={() => setType("expense")}
          aria-pressed={type === "expense"}
        >
          지출
        </Button>
        <Button
          variant={type === "income" ? "primary" : "secondary"}
          onClick={() => setType("income")}
          aria-pressed={type === "income"}
        >
          수입
        </Button>
      </div>

      <FormField label="날짜">
        <input
          className="h-10 rounded-lg border border-line bg-field px-3 text-sm"
          type="date"
          value={date}
          onChange={(event) => setDate(event.target.value)}
        />
      </FormField>

      <FormField label="금액">
        <input
          className="h-10 rounded-lg border border-line bg-field px-3 text-sm"
          inputMode="numeric"
          placeholder="예: 12500"
          value={amountText}
          onChange={(event) => setAmountText(event.target.value)}
        />
      </FormField>

      <FormField label="카테고리">
        <select
          className="h-10 rounded-lg border border-line bg-field px-3 text-sm"
          value={categoryId}
          onChange={(event) => setCategoryId(event.target.value)}
        >
          {activeCategories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </FormField>

      <FormField label="메모">
        <textarea
          className="min-h-20 resize-y rounded-lg border border-line bg-field px-3 py-2 text-sm"
          placeholder="선택 입력"
          value={memo}
          onChange={(event) => setMemo(event.target.value)}
        />
      </FormField>

      {error ? <p className="text-sm text-coral">{error}</p> : null}

      <Button type="submit" variant="primary" className="w-full">
        <Plus size={17} aria-hidden="true" />
        거래 추가
      </Button>
    </form>
  );
}
