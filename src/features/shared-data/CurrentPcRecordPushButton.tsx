// 현재 기록 업데이트 버튼을 거래 입력 폼에서 재사용합니다.
import { useState } from "react";
import { Upload } from "lucide-react";
import { Button } from "../../shared/ui/Button";
import { NotionSyncProgress, type NotionSyncState } from "../backup/NotionSyncProgress";
import {
  formatCurrentPcRecordPushProgress,
  formatCurrentPcRecordPushResult,
  pushCurrentPcRecords,
} from "./current-pc-record-push-service";
import { hasGitHubSharedDataToken, loadGitHubSharedDataSettings } from "./github-shared-data-service";

export function CurrentPcRecordPushButton() {
  const [isPushing, setIsPushing] = useState(false);
  const [message, setMessage] = useState("");
  const [notionSync, setNotionSync] = useState<NotionSyncState | null>(null);
  const [hasToken, setHasToken] = useState(() => hasGitHubSharedDataToken(loadGitHubSharedDataSettings()));

  async function handlePush() {
    if (isPushing) return;

    const settings = loadGitHubSharedDataSettings();
    const nextHasToken = hasGitHubSharedDataToken(settings);
    setHasToken(nextHasToken);

    if (!nextHasToken) {
      setMessage("GitHub 공유 설정에서 토큰을 먼저 저장하세요.");
      return;
    }

    setIsPushing(true);
    setNotionSync(null);
    setMessage("현재 기록을 업데이트 중입니다.");
    let isActive = true;
    const slowNoticeTimer = window.setTimeout(() => {
      if (isActive) {
        setMessage("GitHub API 응답을 기다리는 중입니다. 공유 파일 조회나 커밋이 오래 걸릴 수 있습니다.");
      }
    }, 10000);

    try {
      const result = await pushCurrentPcRecords(settings, {
        onProgress: (progress) => {
          if (progress.phase === "notion_start") setNotionSync({ status: "running" });
          if (progress.phase === "notion_batch") setNotionSync({ status: "running", progress: progress.progress });
          if (progress.phase === "github_success") {
            window.clearTimeout(slowNoticeTimer);
          }

          setMessage(formatCurrentPcRecordPushProgress(progress));
        },
      });
      setMessage(formatCurrentPcRecordPushResult(result));
      if (result.notion.status === "success") {
        setNotionSync({ status: "success", progress: result.notion.result });
      } else {
        const error = result.notion.message;
        setNotionSync((previous) => ({ status: "error", progress: previous?.progress, error }));
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "현재 기록 업데이트에 실패했습니다.");
    } finally {
      isActive = false;
      window.clearTimeout(slowNoticeTimer);
      setIsPushing(false);
    }
  }

  return (
    <div className="grid gap-2 border-t border-line pt-3">
      <Button variant="secondary" className="w-full" disabled={isPushing} onClick={handlePush}>
        <Upload size={17} aria-hidden="true" />
        {isPushing ? "업데이트 중" : "현재 기록 업데이트"}
      </Button>
      {notionSync ? <NotionSyncProgress state={notionSync} /> : null}
      {message && (!notionSync || !isPushing) ? (
        <p className={hasToken ? "text-sm text-muted" : "text-sm text-coral"}>{message}</p>
      ) : null}
    </div>
  );
}
