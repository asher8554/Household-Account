// Notion 백업의 대기·진행·완료·오류 상태를 진행률 막대로 표시합니다.
/** @jsxImportSource react */
import { AlertCircle, CheckCircle2, CloudUpload } from "lucide-react";
import type { NotionBackupResult } from "./notion-backup-service";

export type NotionSyncState = {
  status: "running" | "success" | "error";
  progress?: NotionBackupResult;
  error?: string;
};

export function NotionSyncProgress({ state }: { state: NotionSyncState }) {
  const { status, progress } = state;
  const total = Math.max(0, progress?.transactions ?? 0);
  const processed = status === "success" ? total : Math.min(total, Math.max(0, progress?.processed ?? 0));
  const percent = status === "success" ? 100 : total > 0 ? Math.min(99, Math.floor(processed / total * 100)) : 0;
  const waiting = !progress && status === "running";
  const checking = progress?.phase === "checking";
  const Icon = status === "success" ? CheckCircle2 : status === "error" ? AlertCircle : CloudUpload;
  const title = status === "success" ? "Notion 기록 완료" : status === "error" ? "Notion 기록 중단" : checking ? "동일 기록 확인 중" : "Notion에 기록 중";
  const error = state.error === "Failed to fetch"
    ? "서버 연결이 끊겼습니다. 저장된 기록은 유지되며 다시 시도할 수 있습니다."
    : state.error;

  return (
    <section className="notion-sync-progress rounded-lg border border-line bg-panel p-4" aria-label="Notion 백업 상태">
      <div className="flex items-center justify-between gap-3">
        <p className={`flex min-w-0 items-center gap-2 text-sm font-medium ${status === "error" ? "text-coral" : "text-ink"}`}>
          <Icon size={17} className="shrink-0" aria-hidden="true" />
          {title}
        </p>
        <span className="shrink-0 text-lg font-semibold tabular-nums text-ink">{waiting ? "응답 대기" : `${percent}%`}</span>
      </div>
      <div
        className="notion-progress-track mt-3"
        role="progressbar"
        aria-label="Notion 백업 진행률"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={waiting ? undefined : percent}
        aria-valuetext={waiting ? "첫 응답을 기다리고 있습니다" : `${percent}%, ${processed.toLocaleString("ko-KR")} / ${total.toLocaleString("ko-KR")}건`}
      >
        <div
          className={`notion-progress-fill ${waiting ? "notion-progress-waiting" : ""} ${status === "error" ? "notion-progress-error" : ""}`}
          style={{ width: waiting ? "35%" : `${percent}%`, opacity: waiting || percent > 0 ? 1 : 0 }}
        />
      </div>
      <p className="mt-2 text-sm tabular-nums text-muted" aria-live="polite">
        {waiting ? "Notion 연결과 저장된 기록을 확인하고 있습니다." : status === "success" && progress?.phase === "saving" && total === 0 && progress.categories === 0
          ? "추가·변경된 기록이 없어 저장 작업을 건너뛰었습니다."
          : progress
          ? `${processed.toLocaleString("ko-KR")} / ${total.toLocaleString("ko-KR")}건 확인${status === "success" ? " 완료" : ""} · 카테고리 ${progress.categories.toLocaleString("ko-KR")}개`
          : "저장 요청을 완료하지 못했습니다."}
      </p>
      {progress?.skipped !== undefined ? (
        <p className="mt-2 text-sm tabular-nums text-muted">동일 기록 {progress.skipped.toLocaleString("ko-KR")}건 작업 제외{checking ? " · 새 기록과 변경된 기록을 찾고 있습니다." : " · 거래·카테고리 합계"}</p>
      ) : null}
      {progress ? (
        <dl className="mt-3 grid grid-cols-3 gap-2 border-t border-line pt-3 text-xs text-muted">
          {([["새로 저장", progress.created], ["업데이트", progress.updated], ["정리", progress.legacyRemoved]] as const).map(([label, count]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd className="mt-1 text-sm font-medium tabular-nums text-ink">{count.toLocaleString("ko-KR")}건</dd>
            </div>
          ))}
        </dl>
      ) : null}
      {status === "error" && error ? <p role="alert" className="mt-3 text-sm leading-6 text-coral">{error}</p> : null}
    </section>
  );
}
