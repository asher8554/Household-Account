// 선택한 날짜의 거래 목록과 삭제 액션을 보여줍니다.
import { formatDateLabel } from "../../lib/date";
import { formatKrw } from "../../lib/money";
import { SectionPanel } from "../../shared/ui/SectionPanel";
import type { Category } from "../categories/category-types";
import type { Transaction } from "../transactions/transaction-types";
import { TransactionList } from "./TransactionList";

type DayDetailPanelProps = {
  dateKey: string;
  transactions: Transaction[];
  categories: Category[];
  onDeleteTransaction: (id: string) => void;
  onChangeTransactionCategory: (id: string, categoryId: string) => void;
};

export function DayDetailPanel({
  dateKey,
  transactions,
  categories,
  onDeleteTransaction,
  onChangeTransactionCategory,
}: DayDetailPanelProps) {
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

      <div className="mt-4">
        <TransactionList
          transactions={transactions}
          categories={categories}
          emptyMessage="거래 없음."
          onDeleteTransaction={onDeleteTransaction}
          onChangeTransactionCategory={onChangeTransactionCategory}
        />
      </div>
    </SectionPanel>
  );
}
