// 현재 PC 기록 push 버튼을 거래 입력 폼에서 재사용합니다.
import { useState } from "react";
import { Upload } from "lucide-react";
import { Button } from "../../shared/ui/Button";
import {
  formatCurrentPcRecordPushProgress,
  formatCurrentPcRecordPushResult,
  pushCurrentPcRecords,
} from "./current-pc-record-push-service";
import { hasGitHubSharedDataToken, loadGitHubSharedDataSettings } from "./github-shared-data-service";

export function CurrentPcRecordPushButton() {
  const [isPushing, setIsPushing] = useState(false);
  const [message, setMessage] = useState("");
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
    setMessage("현재 PC 기록을 GitHub 공유 데이터로 push 중입니다.");
    let isActive = true;
    const slowNoticeTimer = window.setTimeout(() => {
      if (isActive) {
        setMessage("GitHub API 응답을 기다리는 중입니다. 공유 파일 조회나 커밋이 오래 걸릴 수 있습니다.");
      }
    }, 10000);

    try {
      const result = await pushCurrentPcRecords(settings, {
        onProgress: (progress) => {
          if (progress.phase === "github_success") {
            window.clearTimeout(slowNoticeTimer);
          }

          setMessage(formatCurrentPcRecordPushProgress(progress));
        },
      });
      setMessage(formatCurrentPcRecordPushResult(result));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "GitHub 공유 데이터 push에 실패했습니다.");
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
        {isPushing ? "push 중" : "현재 PC 기록 push"}
      </Button>
      {message ? (
        <p className={hasToken ? "text-sm text-muted" : "text-sm text-coral"}>{message}</p>
      ) : null}
    </div>
  );
}
