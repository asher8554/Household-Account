// GitHub 공유 데이터 push 설정 UI를 제공합니다.
import { FormEvent, useState } from "react";
import { Github, RotateCcw, Save, Upload } from "lucide-react";
import { Button } from "../../shared/ui/Button";
import { FormField } from "../../shared/ui/FormField";
import { SectionPanel } from "../../shared/ui/SectionPanel";
import {
  clearGitHubSharedDataSettings,
  defaultGitHubSharedDataSettings,
  hasGitHubSharedDataToken,
  hasSyncPassphrase,
  loadGitHubSharedDataSettings,
  saveGitHubSharedDataSettings,
  type GitHubSharedDataSettings,
} from "./github-shared-data-service";
import { loadPublishedSharedData } from "./shared-data-service";
import {
  formatCurrentPcRecordPushProgress,
  formatCurrentPcRecordPushResult,
  pushCurrentPcRecords,
} from "./current-pc-record-push-service";

export function GitHubSharedDataPanel() {
  const [settings, setSettings] = useState<GitHubSharedDataSettings>(() => loadGitHubSharedDataSettings());
  const [message, setMessage] = useState("");
  const [isPushing, setIsPushing] = useState(false);
  const isReadyToPush = hasGitHubSharedDataToken(settings) && hasSyncPassphrase(settings);

  function updateField(field: keyof GitHubSharedDataSettings, value: string) {
    setSettings((previous) => ({ ...previous, [field]: value }));
  }

  function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    saveGitHubSharedDataSettings(settings);
    setSettings(loadGitHubSharedDataSettings());
    setMessage("GitHub 공유 설정을 저장했습니다. 공유 파일 동기화를 다시 시도합니다.");
    void loadPublishedSharedData();
  }

  function handleReset() {
    clearGitHubSharedDataSettings();
    setSettings(defaultGitHubSharedDataSettings);
    setMessage("GitHub 공유 설정을 초기화했습니다.");
  }

  async function handlePushCurrentData() {
    if (!isReadyToPush || isPushing) return;

    setIsPushing(true);
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
          if (progress.phase === "github_success") {
            window.clearTimeout(slowNoticeTimer);
          }

          setMessage(formatCurrentPcRecordPushProgress(progress));
        },
      });
      setMessage(formatCurrentPcRecordPushResult(result));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "현재 기록 업데이트에 실패했습니다.");
    } finally {
      isActive = false;
      window.clearTimeout(slowNoticeTimer);
      setIsPushing(false);
    }
  }

  return (
    <SectionPanel
      title="GitHub 공유 설정"
      eyebrow={isReadyToPush ? "수동 업데이트 준비됨" : "토큰·암호 필요"}
      action={
        <Button size="sm" variant="ghost" onClick={handleReset}>
          <RotateCcw size={15} aria-hidden="true" />
          초기화
        </Button>
      }
    >
      <form className="grid gap-3" onSubmit={handleSave}>
        <div className="grid gap-3 md:grid-cols-2">
          <FormField label="Owner">
            <input
              className="h-10 w-full rounded-lg border border-line bg-field px-3 text-sm"
              value={settings.owner}
              onChange={(event) => updateField("owner", event.target.value)}
            />
          </FormField>
          <FormField label="Repository">
            <input
              className="h-10 w-full rounded-lg border border-line bg-field px-3 text-sm"
              value={settings.repo}
              onChange={(event) => updateField("repo", event.target.value)}
            />
          </FormField>
          <FormField label="Branch">
            <input
              className="h-10 w-full rounded-lg border border-line bg-field px-3 text-sm"
              value={settings.branch}
              onChange={(event) => updateField("branch", event.target.value)}
            />
          </FormField>
          <FormField label="공유 파일 경로">
            <input
              className="h-10 w-full rounded-lg border border-line bg-field px-3 text-sm"
              value={settings.path}
              onChange={(event) => updateField("path", event.target.value)}
            />
          </FormField>
        </div>
        <FormField label="GitHub 토큰">
          <input
            className="h-10 w-full rounded-lg border border-line bg-field px-3 text-sm"
            type="password"
            value={settings.token}
            onChange={(event) => updateField("token", event.target.value)}
            placeholder="fine-grained token, Contents read/write"
            autoComplete="off"
          />
        </FormField>
        <FormField label="공유 데이터 암호">
          <input
            className="h-10 w-full rounded-lg border border-line bg-field px-3 text-sm"
            type="password"
            value={settings.passphrase}
            onChange={(event) => updateField("passphrase", event.target.value)}
            placeholder="공유 파일을 잠그는 암호 (기기마다 동일하게)"
            autoComplete="new-password"
          />
        </FormField>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="primary" type="submit">
            <Save size={16} aria-hidden="true" />
            설정 저장
          </Button>
          <Button
            variant="secondary"
            type="button"
            disabled={!isReadyToPush || isPushing}
            onClick={handlePushCurrentData}
          >
            <Upload size={16} aria-hidden="true" />
            {isPushing ? "업데이트 중" : "현재 기록 업데이트"}
          </Button>
          <div className="flex items-center gap-2 text-sm text-muted">
            <Github size={16} aria-hidden="true" />
            <span>GitHub Pages 공유 파일로 커밋하고 Notion에도 기록됩니다.</span>
          </div>
        </div>
      </form>
      {message ? <p className="mt-3 text-sm text-muted">{message}</p> : null}
      <p className="mt-3 text-sm leading-6 text-muted">
        공유 파일은 입력한 암호로 암호화되어 커밋되므로 GitHub 저장소에는 평문 내역이 남지 않습니다. 토큰과
        공유 데이터 암호는 브라우저를 닫으면 지워지는 세션 저장소에만 보관되므로, 새 브라우저에서는 다시
        입력해야 합니다. 암호를 잃으면 다른 기기의 공유 파일을 열 수 없지만 이 기기의 데이터는 그대로
        유지됩니다.
      </p>
    </SectionPanel>
  );
}
