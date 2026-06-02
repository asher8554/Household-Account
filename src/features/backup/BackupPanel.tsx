// JSON 백업과 전체 초기화 UI를 제공합니다.
import { ChangeEvent, useRef, useState } from "react";
import { Download, RotateCcw, Upload } from "lucide-react";
import { Button } from "../../shared/ui/Button";
import { SectionPanel } from "../../shared/ui/SectionPanel";
import { downloadBackupFile, importBackupFile, resetAllData } from "./backup-service";
import type { ImportSummary } from "./backup-types";

function formatImportSummary(summary: ImportSummary) {
  return `카테고리 ${summary.categoriesAdded}개 추가, ${summary.categoriesUpdated}개 수정. 거래 ${summary.transactionsAdded}개 추가, ${summary.transactionsUpdated}개 수정.`;
}

export function BackupPanel() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [resetText, setResetText] = useState("");
  const [message, setMessage] = useState("");

  async function handleImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const summary = await importBackupFile(file);
      setMessage(formatImportSummary(summary));
    } catch {
      setMessage("JSON 백업 파일을 확인하세요.");
    } finally {
      event.target.value = "";
    }
  }

  async function handleReset() {
    if (resetText !== "초기화") return;
    await resetAllData();
    setResetText("");
    setMessage("전체 데이터를 초기화했습니다.");
  }

  return (
    <SectionPanel title="백업" eyebrow="JSON">
      <div className="grid gap-2">
        <Button variant="secondary" onClick={() => void downloadBackupFile()}>
          <Download size={17} aria-hidden="true" />
          내보내기
        </Button>
        <input ref={fileInputRef} className="hidden" type="file" accept="application/json" onChange={handleImport} />
        <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>
          <Upload size={17} aria-hidden="true" />
          가져오기
        </Button>
      </div>

      <div className="mt-4 border-t border-line pt-4">
        <label className="grid gap-2 text-sm">
          <span className="font-medium">전체 초기화</span>
          <input
            className="h-10 rounded-lg border border-line bg-field px-3 text-sm"
            placeholder="초기화"
            value={resetText}
            onChange={(event) => setResetText(event.target.value)}
          />
        </label>
        <Button
          className="mt-2 w-full"
          variant="danger"
          disabled={resetText !== "초기화"}
          onClick={handleReset}
        >
          <RotateCcw size={17} aria-hidden="true" />
          데이터 초기화
        </Button>
      </div>

      {message ? <p className="mt-3 text-sm text-muted">{message}</p> : null}
    </SectionPanel>
  );
}
