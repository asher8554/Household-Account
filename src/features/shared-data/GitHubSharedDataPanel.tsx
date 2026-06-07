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
  loadGitHubSharedDataSettings,
  saveGitHubSharedDataSettings,
  type GitHubSharedDataSettings,
} from "./github-shared-data-service";
import {
  formatCurrentPcRecordPushResult,
  pushCurrentPcRecords,
} from "./current-pc-record-push-service";

export function GitHubSharedDataPanel() {
  const [settings, setSettings] = useState<GitHubSharedDataSettings>(() => loadGitHubSharedDataSettings());
  const [message, setMessage] = useState("");
  const [isPushing, setIsPushing] = useState(false);
  const hasToken = hasGitHubSharedDataToken(settings);

  function updateField(field: keyof GitHubSharedDataSettings, value: string) {
    setSettings((previous) => ({ ...previous, [field]: value }));
  }

  function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    saveGitHubSharedDataSettings(settings);
    setSettings(loadGitHubSharedDataSettings());
    setMessage("GitHub 공유 설정을 저장했습니다.");
  }

  function handleReset() {
    clearGitHubSharedDataSettings();
    setSettings(defaultGitHubSharedDataSettings);
    setMessage("GitHub 공유 설정을 초기화했습니다.");
  }

  async function handlePushCurrentData() {
    if (!hasToken || isPushing) return;

    setIsPushing(true);
    setMessage("현재 PC 기록을 GitHub 공유 데이터로 push 중입니다.");

    try {
      const result = await pushCurrentPcRecords(settings);
      setMessage(formatCurrentPcRecordPushResult(result));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "GitHub 공유 데이터 push에 실패했습니다.");
    } finally {
      setIsPushing(false);
    }
  }

  return (
    <SectionPanel
      title="GitHub 공유 설정"
      eyebrow={hasToken ? "수동 push 준비됨" : "토큰 필요"}
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
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="primary" type="submit">
            <Save size={16} aria-hidden="true" />
            설정 저장
          </Button>
          <Button
            variant="secondary"
            type="button"
            disabled={!hasToken || isPushing}
            onClick={handlePushCurrentData}
          >
            <Upload size={16} aria-hidden="true" />
            {isPushing ? "push 중" : "현재 PC 기록 push"}
          </Button>
          <div className="flex items-center gap-2 text-sm text-muted">
            <Github size={16} aria-hidden="true" />
            <span>GitHub Pages 공유 파일로 커밋하고 Notion에도 기록됩니다.</span>
          </div>
        </div>
      </form>
      {message ? <p className="mt-3 text-sm text-muted">{message}</p> : null}
      <p className="mt-3 text-sm leading-6 text-muted">
        GitHub Pages 공유는 public/shared-data.json을 이 repo에 공개 커밋합니다. 토큰은 이 브라우저
        localStorage에만 저장되고 Contents read/write 권한만 필요합니다.
      </p>
    </SectionPanel>
  );
}
