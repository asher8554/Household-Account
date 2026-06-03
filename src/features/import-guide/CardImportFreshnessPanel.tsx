// 신한카드와 현대카드 파일 로드 최신 상태를 보여줍니다.
import { differenceInCalendarDays } from "date-fns";
import { AlertTriangle, CheckCircle2, Clock3 } from "lucide-react";
import { useMemo } from "react";
import { useLiveQuery } from "../../db/use-live-query";
import { SectionPanel } from "../../shared/ui/SectionPanel";
import {
  cardImportSources,
  listCardImportStatuses,
  staleImportThresholdDays,
} from "./import-status-service";
import type { CardImportStatus } from "./import-status-types";

const emptyStatuses: CardImportStatus[] = [];

export function CardImportFreshnessPanel() {
  const { data: statuses } = useLiveQuery(listCardImportStatuses, [], emptyStatuses);
  const statusMap = useMemo(() => new Map(statuses.map((status) => [status.source, status])), [statuses]);
  const now = new Date();

  return (
    <SectionPanel title="카드 데이터 로드 상태" eyebrow={`${staleImportThresholdDays}일 기준`}>
      <div className="grid gap-3 md:grid-cols-2">
        {cardImportSources.map((source) => {
          const status = statusMap.get(source.source);
          const view = buildStatusView(source.label, status, now);
          const Icon = view.needsLoad ? AlertTriangle : CheckCircle2;

          return (
            <article
              key={source.source}
              className={`rounded-lg border p-4 ${
                view.needsLoad ? "border-coral bg-coral-soft" : "border-line bg-field"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-ink">{source.label}</h3>
                  <p className={`mt-1 text-sm font-medium ${view.needsLoad ? "text-coral" : "text-mint"}`}>
                    {view.label}
                  </p>
                </div>
                <Icon className={view.needsLoad ? "text-coral" : "text-mint"} size={22} aria-hidden="true" />
              </div>

              <div className="mt-3 grid gap-2 text-sm text-muted">
                <p>{view.message}</p>
                {status ? (
                  <>
                    <p className="flex items-center gap-2 text-ink">
                      <Clock3 size={15} aria-hidden="true" />
                      마지막 로드 {formatDateTime(status.lastLoadedAt)}
                    </p>
                    <p className="truncate">파일 {status.lastFileName}</p>
                    <p>
                      후보 {status.lastCandidateCount}건, 저장 가능 {status.lastReadyCount}건, 중복{" "}
                      {status.lastDuplicateCount}건, 오류 {status.lastInvalidCount}건.
                    </p>
                  </>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
    </SectionPanel>
  );
}

function buildStatusView(label: string, status: CardImportStatus | undefined, now: Date) {
  if (!status) {
    return {
      needsLoad: true,
      label: "데이터 로드 필요",
      message: `${label} 파일을 아직 불러온 기록이 없습니다.`,
    };
  }

  const loadedAt = new Date(status.lastLoadedAt);
  const daysSince = Number.isNaN(loadedAt.getTime()) ? staleImportThresholdDays : differenceInCalendarDays(now, loadedAt);
  const needsLoad = daysSince >= staleImportThresholdDays;

  return {
    needsLoad,
    label: needsLoad ? "데이터 로드 필요" : "최신 상태",
    message: needsLoad
      ? `${label} 데이터를 ${daysSince}일 동안 새로 불러오지 않았습니다.`
      : daysSince === 0
        ? `${label} 데이터를 오늘 불러왔습니다.`
        : `${label} 데이터를 ${daysSince}일 전에 불러왔습니다.`,
  };
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
