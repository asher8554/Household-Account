// 신한카드 가져오기 후보의 저장 전 미리보기를 표시합니다.
import { CheckCircle2, CircleAlert, CopyCheck, XCircle } from "lucide-react";
import { formatKrw } from "../../lib/money";
import { Button } from "../../shared/ui/Button";
import type { ShinhanPreviewItem, ShinhanPreviewStatus } from "./shinhan-import-types";

type ShinhanImportPreviewProps = {
  items: ShinhanPreviewItem[];
  isImporting: boolean;
  onImport: () => void;
};

const statusLabels: Record<ShinhanPreviewStatus, string> = {
  ready: "저장 가능",
  duplicate: "중복 제외",
  invalid: "오류",
};

const statusClasses: Record<ShinhanPreviewStatus, string> = {
  ready: "bg-mint-soft text-mint",
  duplicate: "bg-honey-soft text-honey",
  invalid: "bg-coral-soft text-coral",
};

export function ShinhanImportPreview({ items, isImporting, onImport }: ShinhanImportPreviewProps) {
  const readyCount = items.filter((item) => item.previewStatus === "ready").length;
  const duplicateCount = items.filter((item) => item.previewStatus === "duplicate").length;
  const invalidCount = items.filter((item) => item.previewStatus === "invalid").length;

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-line bg-field p-4 text-sm text-muted">
        아직 미리보기 거래가 없습니다.
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      <div className="grid gap-2 md:grid-cols-4">
        <SummaryBadge icon={CheckCircle2} label="저장 가능" value={readyCount} />
        <SummaryBadge icon={CopyCheck} label="중복 제외" value={duplicateCount} />
        <SummaryBadge icon={CircleAlert} label="오류" value={invalidCount} />
        <Button variant="primary" onClick={onImport} disabled={readyCount === 0 || isImporting}>
          {isImporting ? "저장 중" : `${readyCount}건 저장`}
        </Button>
      </div>
      <div className="overflow-x-auto rounded-lg border border-line">
        <table className="min-w-[760px] w-full border-collapse text-left text-sm">
          <thead className="bg-field text-xs uppercase text-muted">
            <tr>
              <th className="border-b border-line px-3 py-2 font-medium">상태</th>
              <th className="border-b border-line px-3 py-2 font-medium">날짜</th>
              <th className="border-b border-line px-3 py-2 font-medium">구분</th>
              <th className="border-b border-line px-3 py-2 font-medium">가맹점</th>
              <th className="border-b border-line px-3 py-2 text-right font-medium">금액</th>
              <th className="border-b border-line px-3 py-2 font-medium">메모</th>
            </tr>
          </thead>
          <tbody>
            {items.slice(0, 80).map((item) => (
              <tr key={item.id} className="border-b border-line last:border-b-0">
                <td className="px-3 py-2">
                  <span className={`rounded-full px-2 py-1 text-xs font-medium ${statusClasses[item.previewStatus]}`}>
                    {statusLabels[item.previewStatus]}
                  </span>
                </td>
                <td className="whitespace-nowrap px-3 py-2">{item.date || "-"}</td>
                <td className="whitespace-nowrap px-3 py-2">{item.type === "income" ? "취소/환급" : "지출"}</td>
                <td className="max-w-[220px] truncate px-3 py-2">{item.merchant || "-"}</td>
                <td className="whitespace-nowrap px-3 py-2 text-right">{item.amount ? formatKrw(item.amount) : "-"}</td>
                <td className="max-w-[280px] truncate px-3 py-2 text-muted">{item.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {items.length > 80 ? (
        <div className="flex items-center gap-2 text-sm text-muted">
          <XCircle size={15} aria-hidden="true" />
          화면에는 80건까지만 표시합니다. 저장은 전체 저장 가능 건에 적용됩니다.
        </div>
      ) : null}
    </div>
  );
}

type SummaryBadgeProps = {
  icon: typeof CheckCircle2;
  label: string;
  value: number;
};

function SummaryBadge({ icon: Icon, label, value }: SummaryBadgeProps) {
  return (
    <div className="flex h-10 items-center justify-between rounded-lg border border-line bg-field px-3 text-sm">
      <span className="flex items-center gap-2 text-muted">
        <Icon size={16} aria-hidden="true" />
        {label}
      </span>
      <span className="font-semibold text-ink">{value}</span>
    </div>
  );
}
