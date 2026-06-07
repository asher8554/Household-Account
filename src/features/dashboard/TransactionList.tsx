// 대시보드에서 거래 행 목록과 상세 펼침 UI를 재사용합니다.
import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Trash2 } from "lucide-react";
import { formatKrw } from "../../lib/money";
import { Button } from "../../shared/ui/Button";
import type { Category, CategoryType } from "../categories/category-types";
import type { Transaction } from "../transactions/transaction-types";

type TransactionListProps = {
  transactions: Transaction[];
  categories: Category[];
  emptyMessage: string;
  showDate?: boolean;
  showSingleItemCategoryChange?: boolean;
  onDeleteTransaction: (id: string) => void;
  onChangeTransactionCategory: (id: string, categoryId: string) => void;
  onChangeSingleTransactionCategory?: (id: string, categoryId: string) => void;
};

const sourceLabels: Record<Transaction["source"], string> = {
  manual: "수동 입력",
  csv: "CSV",
  "shinhan-file": "신한카드 파일",
  "hyundai-card-file": "현대카드 파일",
  "shinhan-notification": "신한카드 알림",
  "bank-file": "은행 파일",
  "naver-pay-file": "네이버페이 파일",
};

export function TransactionList({
  transactions,
  categories,
  emptyMessage,
  showDate = false,
  showSingleItemCategoryChange = false,
  onDeleteTransaction,
  onChangeTransactionCategory,
  onChangeSingleTransactionCategory,
}: TransactionListProps) {
  const [expandedTransactionIds, setExpandedTransactionIds] = useState<Set<string>>(() => new Set());
  const [singleItemCategoryChangeIds, setSingleItemCategoryChangeIds] = useState<Set<string>>(() => new Set());
  const categoryMap = new Map(categories.map((category) => [category.id, category]));
  const activeCategoriesByType = useMemo(
    () => ({
      expense: categories.filter((category) => category.type === "expense" && category.isActive),
      income: categories.filter((category) => category.type === "income" && category.isActive),
    }),
    [categories],
  );

  function toggleTransaction(transactionId: string) {
    setExpandedTransactionIds((previous) => {
      const next = new Set(previous);

      if (next.has(transactionId)) {
        next.delete(transactionId);
      } else {
        next.add(transactionId);
      }

      return next;
    });
  }

  function getCategoryOptions(type: CategoryType, currentCategory: Category | undefined) {
    const activeCategories = activeCategoriesByType[type];

    if (!currentCategory || activeCategories.some((category) => category.id === currentCategory.id)) {
      return activeCategories;
    }

    return [currentCategory, ...activeCategories];
  }

  function toggleSingleItemCategoryChange(transactionId: string) {
    setSingleItemCategoryChangeIds((previous) => {
      const next = new Set(previous);

      if (next.has(transactionId)) {
        next.delete(transactionId);
      } else {
        next.add(transactionId);
      }

      return next;
    });
  }

  function handleCategoryChange(transactionId: string, categoryId: string) {
    if (showSingleItemCategoryChange && singleItemCategoryChangeIds.has(transactionId)) {
      onChangeSingleTransactionCategory?.(transactionId, categoryId);
      return;
    }

    onChangeTransactionCategory(transactionId, categoryId);
  }

  if (transactions.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-line px-3 py-6 text-center text-sm text-muted">
        {emptyMessage}
      </p>
    );
  }

  return (
    <div className="grid gap-2">
      {transactions.map((transaction) => {
        const category = categoryMap.get(transaction.categoryId);
        const isExpanded = expandedTransactionIds.has(transaction.id);
        const isSingleItemCategoryChange = singleItemCategoryChangeIds.has(transaction.id);
        const categoryOptions = getCategoryOptions(transaction.type, category);

        return (
          <div
            key={transaction.id}
            className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 border-b border-line py-2 last:border-b-0"
          >
            <div className="min-w-0">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 shrink-0 px-0"
                  onClick={() => toggleTransaction(transaction.id)}
                  aria-expanded={isExpanded}
                  aria-label={isExpanded ? "거래 상세 접기" : "거래 상세 펼치기"}
                  title={isExpanded ? "거래 상세 접기" : "거래 상세 펼치기"}
                >
                  {isExpanded ? (
                    <ChevronDown size={16} aria-hidden="true" />
                  ) : (
                    <ChevronRight size={16} aria-hidden="true" />
                  )}
                </Button>
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: category?.color ?? "#6d746a" }}
                />
                {categoryOptions.length > 0 ? (
                  <select
                    className="h-8 min-w-0 max-w-[9.5rem] rounded-md border border-line bg-field px-2 text-xs font-medium text-ink"
                    value={transaction.categoryId}
                    onChange={(event) => handleCategoryChange(transaction.id, event.target.value)}
                    aria-label={`${transaction.memo || "거래"} 카테고리`}
                  >
                    {categoryOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="truncate text-sm font-medium">{category?.name ?? "기타"}</span>
                )}
                {showSingleItemCategoryChange && onChangeSingleTransactionCategory ? (
                  <label className="flex shrink-0 items-center gap-1 text-xs text-muted">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-line accent-moss"
                      checked={isSingleItemCategoryChange}
                      onChange={() => toggleSingleItemCategoryChange(transaction.id)}
                    />
                    <span>한 항목만 변경</span>
                  </label>
                ) : null}
                {showDate ? <span className="shrink-0 text-xs text-muted">{transaction.date}</span> : null}
              </div>
              <button
                type="button"
                className="mt-1 block w-full rounded-sm text-left text-xs text-muted hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-moss"
                onClick={() => toggleTransaction(transaction.id)}
              >
                <span className={isExpanded ? "whitespace-pre-wrap break-words" : "block truncate"}>
                  {transaction.memo || "메모 없음."}
                </span>
              </button>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={
                  transaction.type === "income"
                    ? "text-sm font-semibold text-mint"
                    : "text-sm font-semibold text-coral"
                }
              >
                {transaction.type === "income" ? "+" : "-"}
                {formatKrw(transaction.amount)}
              </span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  if (window.confirm("거래를 삭제할까요?")) {
                    onDeleteTransaction(transaction.id);
                  }
                }}
                aria-label="거래 삭제"
                title="거래 삭제"
              >
                <Trash2 size={16} aria-hidden="true" />
              </Button>
            </div>
            {isExpanded ? (
              <div className="col-span-2 rounded-md bg-field px-3 py-2 text-xs text-muted">
                <dl className="grid gap-1.5">
                  {showDate ? (
                    <div className="grid grid-cols-[4rem_minmax(0,1fr)] gap-2">
                      <dt>날짜</dt>
                      <dd className="text-ink">{transaction.date}</dd>
                    </div>
                  ) : null}
                  <div className="grid grid-cols-[4rem_minmax(0,1fr)] gap-2">
                    <dt>사용처</dt>
                    <dd className="whitespace-pre-wrap break-words text-ink">
                      {transaction.memo || "메모 없음."}
                    </dd>
                  </div>
                  <div className="grid grid-cols-[4rem_minmax(0,1fr)] gap-2">
                    <dt>출처</dt>
                    <dd className="text-ink">{sourceLabels[transaction.source]}</dd>
                  </div>
                  <div className="grid grid-cols-[4rem_minmax(0,1fr)] gap-2">
                    <dt>저장</dt>
                    <dd className="text-ink">{formatDateTime(transaction.createdAt)}</dd>
                  </div>
                  <div className="grid grid-cols-[4rem_minmax(0,1fr)] gap-2">
                    <dt>수정</dt>
                    <dd className="text-ink">{formatDateTime(transaction.updatedAt)}</dd>
                  </div>
                </dl>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function formatDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString("ko-KR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}
