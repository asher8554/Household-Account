// JSON 백업과 전체 초기화 UI를 제공합니다.
import { ChangeEvent, useRef, useState } from "react";
import { Download, RotateCcw, Save, Share2, Upload } from "lucide-react";
import { Button } from "../../shared/ui/Button";
import { SectionPanel } from "../../shared/ui/SectionPanel";
import { downloadBackupFile, downloadSharedDataFile, importBackupFile, resetAllData } from "./backup-service";
import {
  loadNotionBackupWriteKey,
  pushCurrentBackupToNotion,
  saveNotionBackupWriteKey,
} from "./notion-backup-service";
import type { ImportSummary } from "./backup-types";

function formatImportSummary(summary: ImportSummary) {
  return `카테고리 ${summary.categoriesAdded}개 추가, ${summary.categoriesUpdated}개 수정. 거래 ${summary.transactionsAdded}개 추가, ${summary.transactionsUpdated}개 수정.`;
}

export function BackupPanel() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [resetText, setResetText] = useState("");
  const [notionBackupKey, setNotionBackupKey] = useState(() => loadNotionBackupWriteKey());
  const [isPushingNotionBackup, setIsPushingNotionBackup] = useState(false);
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

  async function handleSharedExport() {
    const backup = await downloadSharedDataFile();
    setMessage(`공유용 shared-data.json을 내보냈습니다. 거래 ${backup.transactions.length}건.`);
  }

  function handleSaveNotionBackupKey() {
    saveNotionBackupWriteKey(notionBackupKey);
    setNotionBackupKey(loadNotionBackupWriteKey());
    setMessage("Notion 백업 키를 저장했습니다.");
  }

  async function handleNotionBackup() {
    if (isPushingNotionBackup) return;

    setIsPushingNotionBackup(true);
    setMessage("백업 JSON을 Notion에 기록 중입니다.");
    let isActive = true;
    const slowNoticeTimer = window.setTimeout(() => {
      if (isActive) {
        setMessage("Notion 첫 batch 응답을 기다리는 중입니다. 거래가 많으면 시간이 걸릴 수 있습니다.");
      }
    }, 10000);

    try {
      const result = await pushCurrentBackupToNotion(notionBackupKey, {
        onBatchComplete: (progress) => {
          setMessage(
            `Notion에 기록 중입니다. batch ${progress.batchCount} 완료. 거래 처리 ${progress.processed ?? 0}/${progress.transactions}건, 생성 ${progress.created}건, 업데이트 ${progress.updated}건, 정리 ${progress.legacyRemoved}건.`,
          );
        },
      });
      setMessage(
        `Notion에 거래 백업 행을 동기화했습니다. 생성 ${result.created}건, 업데이트 ${result.updated}건, 불필요/중복 행 정리 ${result.legacyRemoved}건. 거래 ${result.transactions}건.`,
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Notion 백업 기록에 실패했습니다.");
    } finally {
      isActive = false;
      window.clearTimeout(slowNoticeTimer);
      setIsPushingNotionBackup(false);
    }
  }

  return (
    <SectionPanel title="백업" eyebrow="JSON">
      <div className="grid gap-2">
        <Button variant="secondary" onClick={() => void downloadBackupFile()}>
          <Download size={17} aria-hidden="true" />
          내보내기
        </Button>
        <Button variant="secondary" onClick={() => void handleSharedExport()}>
          <Share2 size={17} aria-hidden="true" />
          공유용 내보내기
        </Button>
        <input ref={fileInputRef} className="hidden" type="file" accept="application/json" onChange={handleImport} />
        <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>
          <Upload size={17} aria-hidden="true" />
          가져오기
        </Button>
      </div>

      <div className="mt-4 border-t border-line pt-4">
        <label className="grid gap-2 text-sm">
          <span className="font-medium">Notion 백업 키</span>
          <input
            className="h-10 rounded-lg border border-line bg-field px-3 text-sm"
            type="password"
            placeholder="Worker write key"
            value={notionBackupKey}
            onChange={(event) => setNotionBackupKey(event.target.value)}
            autoComplete="off"
          />
        </label>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <Button variant="secondary" onClick={handleSaveNotionBackupKey}>
            <Save size={16} aria-hidden="true" />
            키 저장
          </Button>
          <Button
            variant="secondary"
            disabled={!notionBackupKey.trim() || isPushingNotionBackup}
            onClick={() => void handleNotionBackup()}
          >
            <Share2 size={16} aria-hidden="true" />
            {isPushingNotionBackup ? "기록 중" : "Notion 기록"}
          </Button>
        </div>
        <p className="mt-2 text-xs leading-5 text-muted">
          Notion token은 Worker secret에만 저장합니다. 이 키는 Worker 쓰기 요청 보호용입니다.
        </p>
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
