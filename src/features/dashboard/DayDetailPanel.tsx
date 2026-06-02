// 선택한 날짜의 거래 목록과 삭제 액션을 보여줍니다.
import { Trash2 } from "lucide-react";
import { formatDateLabel } from "../../lib/date";
import { formatKrw } from "../../lib/money";
import { Button } from "../../shared/ui/Button";
import { SectionPanel } from "../../shared/ui/SectionPanel";
import type { Category } from "../categories/category-types";
import type { Transaction } from "../transactions/transaction-types";

type DayDetailPanelProps = {
  dateKey: string;
  transactions: Transaction[];
  categories: Category[];
  onDeleteTransaction: (id: string) => void;
};

export function DayDetailPanel({
  dateKey,
  transactions,
  categories,
  onDeleteTransaction,
}: DayDetailPanelProps) {
  const categoryMap = new Map(categories.map((category) => [category.id, category]));
  const income = transactions
    .filter((transaction) => transaction.type === "income")
    .reduce((sum, transaction) => sum + transaction.amount, 0);
  const expense = transactions
    .filter((transaction) => transaction.type === "expense")
    .reduce((sum, transaction) => sum + transaction.amount, 0);

  return (
    <SectionPanel title="날짜 상세" eyebrow={formatDateLabel(dateKey)}>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="rounded-lg bg-mint-soft px-3 py-2">
          <p className="text-muted">수입</p>
          <p className="font-semibold text-mint">{formatKrw(income)}</p>
        </div>
        <div className="rounded-lg bg-coral-soft px-3 py-2">
          <p className="text-muted">지출</p>
          <p className="font-semibold text-coral">{formatKrw(expense)}</p>
        </div>
      </div>

      <div className="mt-4 grid gap-2">
        {transactions.length === 0 ? (
          <p className="rounded-lg border border-dashed border-line px-3 py-6 text-center text-sm text-muted">
            거래 없음.
          </p>
        ) : (
          transactions.map((transaction) => {
            const category = categoryMap.get(transaction.categoryId);

            return (
              <div
                key={transaction.id}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-line py-2 last:border-b-0"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: category?.color ?? "#6d746a" }}
                    />
                    <span className="truncate text-sm font-medium">{category?.name ?? "기타"}</span>
                  </div>
                  {transaction.memo ? (
                    <p className="mt-0.5 truncate text-xs text-muted">{transaction.memo}</p>
                  ) : null}
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
              </div>
            );
          })
        )}
      </div>
    </SectionPanel>
  );
}
