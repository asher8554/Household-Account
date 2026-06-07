// 금융기관 파일과 신한카드 알림 텍스트 가져오기 화면입니다.
import { ChangeEvent, DragEvent, useState } from "react";
import {
  Bell,
  CheckCircle2,
  ClipboardPaste,
  Download,
  ExternalLink,
  FileSpreadsheet,
  MonitorCog,
  Search,
  Upload,
} from "lucide-react";
import { Button } from "../../shared/ui/Button";
import { FormField } from "../../shared/ui/FormField";
import { SectionPanel } from "../../shared/ui/SectionPanel";
import { listTransactions } from "../transactions/transaction-service";
import { CardImportFreshnessPanel } from "./CardImportFreshnessPanel";
import { ShinhanImportPreview } from "./ShinhanImportPreview";
import { parseShinhanTransactionFile } from "./shinhan-file-parser";
import { buildShinhanPreview, importReadyShinhanItems } from "./shinhan-import-service";
import type { ShinhanPreviewItem } from "./shinhan-import-types";
import { parseShinhanNotificationText } from "./shinhan-notification-parser";
import { isTrackedCardImportSource, recordCardFileLoad } from "./import-status-service";
import { GitHubSharedDataPanel } from "../shared-data/GitHubSharedDataPanel";
import { useInstitutionCatalog } from "../institutions/use-institution-catalog";
import type { InstitutionConfig } from "../institutions/institution-types";
import { BackupPanel } from "../backup/BackupPanel";

type Step = {
  title: string;
  description: string;
  detail: string;
};

const requiredColumns = [
  "이용일자 또는 승인일자",
  "거래일자 또는 거래일시",
  "이용금액 또는 승인금액",
  "출금액 또는 입금액",
  "가맹점명",
  "거래내용 또는 적요",
  "승인/취소 상태",
  "할부개월",
  "승인번호",
  "카드명 또는 카드번호 뒤 4자리",
];

const roadmap = [
  {
    icon: FileSpreadsheet,
    title: "1. 카드/은행/페이 파일 가져오기",
    description: "파일 선택, 드래그앤드롭, xls 자동 변환, 입출금 컬럼 매핑, 미리보기, 중복 제외를 지원합니다.",
  },
  {
    icon: Bell,
    title: "2. 알림 텍스트 붙여넣기 가져오기",
    description: "신한카드 승인 알림 문장을 붙여넣으면 날짜, 금액, 가맹점 후보를 추출하고 미리보기로 저장합니다.",
  },
  {
    icon: MonitorCog,
    title: "3. Win 알림 수집 앱",
    description: "Windows 알림 또는 클립보드 기반 보조 앱으로 거래 후보를 자동 생성합니다.",
  },
];

const emptyPreview: ShinhanPreviewItem[] = [];

export function ShinhanImportGuideScreen() {
  const { catalog } = useInstitutionCatalog();
  const institutions = catalog.institutions;
  const guideInstitution = institutions[0] ?? null;
  const [filePreview, setFilePreview] = useState(emptyPreview);
  const [notificationText, setNotificationText] = useState("");
  const [notificationPreview, setNotificationPreview] = useState(emptyPreview);
  const [statusMessage, setStatusMessage] = useState("");
  const [isParsingFile, setIsParsingFile] = useState(false);
  const [isImportingFile, setIsImportingFile] = useState(false);
  const [isImportingNotification, setIsImportingNotification] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) {
      await processFile(file);
    }

    event.target.value = "";
  }

  async function processFile(file: File) {
    if (isParsingFile) return;

    setIsParsingFile(true);
    setStatusMessage("");

    try {
      const candidates = await parseShinhanTransactionFile(file);
      const preview = buildShinhanPreview(candidates, await listTransactions());
      await recordFileLoadStatus(file.name, preview);
      setFilePreview(preview);
      setStatusMessage(`${file.name}에서 ${preview.length}건을 읽었습니다.`);
    } catch (error) {
      setFilePreview(emptyPreview);
      setStatusMessage(error instanceof Error ? error.message : "파일을 읽지 못했습니다.");
    } finally {
      setIsParsingFile(false);
    }
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragActive(true);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragActive(false);

    const file = event.dataTransfer.files[0];
    if (file) {
      void processFile(file);
    }
  }

  async function handleNotificationPreview() {
    const candidates = parseShinhanNotificationText(notificationText);
    const preview = buildShinhanPreview(candidates, await listTransactions());
    setNotificationPreview(preview);
    setStatusMessage(`알림 텍스트에서 ${preview.length}건을 읽었습니다.`);
  }

  async function recordFileLoadStatus(fileName: string, preview: ShinhanPreviewItem[]) {
    const source = preview.map((item) => item.transactionSource).find(isTrackedCardImportSource);
    if (!source) return;

    await recordCardFileLoad({
      source,
      fileName,
      totalCount: preview.length,
      readyCount: preview.filter((item) => item.previewStatus === "ready").length,
      duplicateCount: preview.filter((item) => item.previewStatus === "duplicate").length,
      invalidCount: preview.filter((item) => item.previewStatus === "invalid").length,
    });
  }

  async function handleFileImport() {
    setIsImportingFile(true);

    try {
      const count = await importReadyShinhanItems(filePreview);
      setFilePreview(buildShinhanPreview(filePreview, await listTransactions()));
      if (count === 0) {
        setStatusMessage("저장할 새 파일 거래가 없습니다.");
        return;
      }

      setStatusMessage(`파일 거래 ${count}건을 저장했습니다.`);
    } finally {
      setIsImportingFile(false);
    }
  }

  async function handleNotificationImport() {
    setIsImportingNotification(true);

    try {
      const count = await importReadyShinhanItems(notificationPreview);
      setNotificationPreview(buildShinhanPreview(notificationPreview, await listTransactions()));
      setStatusMessage(`신한카드 알림 거래 ${count}건을 저장했습니다.`);
    } finally {
      setIsImportingNotification(false);
    }
  }

  return (
    <div className="grid gap-5">
      <section className="rounded-lg border border-line bg-panel p-5 shadow-panel">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
          <div>
            <p className="text-sm font-medium text-moss">금융기관 가져오기</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-normal md:text-3xl">
              카드, 은행, 페이 거래내역을 대시보드 거래로 저장합니다.
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">
              금융기관 계정 비밀번호나 API 토큰은 저장하지 않습니다. 사용자가 내려받은 CSV/xls/xlsx 파일 또는
              붙여넣은 알림 텍스트만 브라우저 안에서 분석하고, 결과는 IndexedDB에 저장합니다.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {institutions.map((institution) => {
                const href = getInstitutionHref(institution, "homepage");
                if (!href) return null;

                return (
                  <a
                    key={institution.name}
                    className="inline-flex h-10 items-center gap-2 rounded-lg bg-moss px-4 text-sm font-medium text-white transition-colors hover:bg-moss-hover"
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <ExternalLink size={16} aria-hidden="true" />
                    {institution.name}
                  </a>
                );
              })}
            </div>
            {statusMessage ? (
              <p className="mt-4 rounded-lg border border-line bg-field px-3 py-2 text-sm text-ink">{statusMessage}</p>
            ) : null}
          </div>
          <div className="rounded-lg border border-line bg-moss-soft p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-moss">
              <CheckCircle2 size={17} aria-hidden="true" />
              저장 기준
            </div>
            <ul className="mt-3 grid gap-2 text-sm text-ink">
              <li>지출은 기본 기타 카테고리.</li>
              <li>승인취소/환급은 기본 기타수입 카테고리.</li>
              <li>은행 출금액은 지출, 입금액은 수입.</li>
              <li>날짜, 구분, 금액, 가맹점명 기준 중복 제외.</li>
              <li>CSV, TSV, TXT, xls, xlsx 지원. 카드/은행/페이 파일 자동 변환.</li>
            </ul>
          </div>
        </div>
      </section>

      <CardImportFreshnessPanel />
      <GitHubSharedDataPanel />
      <BackupPanel />

      <div className="grid gap-5 xl:grid-cols-2">
        <SectionPanel title="CSV/TSV/TXT/xls/xlsx 파일 가져오기" eyebrow="카드/은행/페이 파일">
          <div className="grid gap-4">
            <div className="border-b border-line pb-4 text-sm leading-6 text-muted">
              <p className="font-semibold text-ink">파일 자동 판정</p>
              <p className="mt-1">
                파일명과 헤더로 신한카드, 현대카드, 은행, 네이버페이를 자동 구분합니다. Notion 금융기관 선택값은 파일 파싱에
                사용하지 않습니다.
              </p>
              <p className="mt-1 text-xs">예: Shinhancard_20260607.xlsx, hyundaicard_20260607.xls.</p>
            </div>
            <FormField label="카드 또는 은행 거래내역 파일">
              <input
                className="block w-full rounded-lg border border-line bg-field px-3 py-2 text-sm"
                type="file"
                accept=".csv,.tsv,.txt,.xls,.xlsx,text/csv,text/tab-separated-values,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                onChange={handleFileChange}
                disabled={isParsingFile}
              />
            </FormField>
            <div
              className={`grid min-h-32 place-items-center rounded-lg border border-dashed p-4 text-center transition-colors ${
                isDragActive ? "border-moss bg-moss-soft text-ink" : "border-line bg-field text-muted"
              }`}
              onDragEnter={handleDragOver}
              onDragOver={handleDragOver}
              onDragLeave={() => setIsDragActive(false)}
              onDrop={handleDrop}
            >
              <div className="grid gap-2">
                <Upload className="mx-auto text-moss" size={24} aria-hidden="true" />
                <p className="text-sm font-medium text-ink">파일을 여기로 드래그앤드롭하세요.</p>
                <p className="text-sm leading-6">
                  신한카드, 현대카드, 국민은행, 하나은행, 토스뱅크, 네이버페이 거래내역 파일을 올립니다. CSV, TSV,
                  TXT, xls, xlsx를 지원합니다.
                </p>
              </div>
            </div>
            <ShinhanImportPreview items={filePreview} isImporting={isImportingFile} onImport={handleFileImport} />
          </div>
        </SectionPanel>

        <SectionPanel title="알림 텍스트 붙여넣기" eyebrow="신한카드 알림">
          <div className="grid gap-4">
            <FormField label="승인 알림 텍스트">
              <textarea
                className="min-h-36 w-full resize-y rounded-lg border border-line bg-field px-3 py-2 text-sm leading-6"
                value={notificationText}
                onChange={(event) => setNotificationText(event.target.value)}
                placeholder="[신한카드] 승인 12,300원 06/03 13:22 스타벅스"
              />
            </FormField>
            <div className="flex flex-wrap gap-2">
              <Button variant="primary" onClick={handleNotificationPreview} disabled={!notificationText.trim()}>
                <ClipboardPaste size={16} aria-hidden="true" />
                미리보기
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setNotificationText("");
                  setNotificationPreview(emptyPreview);
                }}
                disabled={!notificationText && notificationPreview.length === 0}
              >
                비우기
              </Button>
            </div>
            <ShinhanImportPreview
              items={notificationPreview}
              isImporting={isImportingNotification}
              onImport={handleNotificationImport}
            />
          </div>
        </SectionPanel>
      </div>

      {guideInstitution ? (
        <div className="grid gap-5 xl:grid-cols-2">
          <GuideStepsPanel
            eyebrow="PC"
            title={`${guideInstitution.name} PC에서 받기`}
            steps={toGuideSteps(guideInstitution.pcSteps)}
            linkLabel={`${guideInstitution.name} 열기`}
            linkHref={getInstitutionHref(guideInstitution, "homepage")}
          />
          <GuideStepsPanel
            eyebrow="Mobile"
            title={`${guideInstitution.name} iPhone에서 찾기`}
            steps={toGuideSteps(guideInstitution.mobileSteps)}
            linkLabel={`${guideInstitution.name} 앱`}
            linkHref={getInstitutionHref(guideInstitution, "mobile")}
          />
        </div>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
        <SectionPanel title="다운로드 후 파일 확인" eyebrow="검수">
          <div className="grid gap-3 md:grid-cols-2">
            {getRequiredColumns(guideInstitution).map((column) => (
              <div key={column} className="flex items-center gap-2 rounded-lg border border-line bg-field px-3 py-2 text-sm">
                <CheckCircle2 className="text-mint" size={16} aria-hidden="true" />
                <span>{column}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-lg border border-line bg-honey-soft p-4 text-sm leading-6">
            <p className="font-semibold text-ink">중요.</p>
            <p className="mt-1 text-muted">
              파일에 승인번호가 없어도 날짜, 금액, 가맹점명 기준으로 중복을 제거합니다. 승인 취소 건은 지출이
              아니라 기타수입으로 저장해서 월 지출 합계가 과하게 커지지 않게 처리합니다.
            </p>
          </div>
        </SectionPanel>

        <SectionPanel title="메뉴를 못 찾을 때" eyebrow="검색어">
          <div className="grid gap-3">
            {["이용내역", "결제내역", "Npay 머니 내역", "매출전표", "엑셀저장", "이용대금명세서"].map((keyword) => (
              <div key={keyword} className="flex items-center gap-2 rounded-lg bg-field px-3 py-2 text-sm">
                <Search className="text-moss" size={16} aria-hidden="true" />
                <span>{keyword}</span>
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm leading-6 text-muted">
            금융기관 웹과 앱은 메뉴명이 바뀔 수 있습니다. 메뉴 경로가 다르면 위 검색어로 찾고, 파일 저장 버튼이
            없으면 PC 홈페이지에서 다시 시도합니다.
          </p>
        </SectionPanel>
      </div>

      <SectionPanel title="구현 로드맵" eyebrow="다음 작업">
        <div className="grid gap-3 lg:grid-cols-3">
          {roadmap.map((item) => {
            const Icon = item.icon;

            return (
              <article key={item.title} className="rounded-lg border border-line bg-field p-4">
                <Icon className="text-moss" size={22} aria-hidden="true" />
                <h3 className="mt-3 text-base font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted">{item.description}</p>
              </article>
            );
          })}
        </div>
      </SectionPanel>
    </div>
  );
}

function getInstitutionHref(institution: InstitutionConfig, preferred: "homepage" | "mobile") {
  if (preferred === "mobile") {
    return institution.mobileAppUrl || institution.homepageUrl;
  }

  return institution.homepageUrl || institution.mobileAppUrl;
}

function getRequiredColumns(institution: InstitutionConfig | null) {
  return institution && institution.requiredColumns.length > 0 ? institution.requiredColumns : requiredColumns;
}

function toGuideSteps(steps: string[]): Step[] {
  const normalizedSteps = steps.map(stripStepPrefix).filter(Boolean);
  const displaySteps =
    normalizedSteps.length > 0
      ? normalizedSteps
      : ["거래내역 화면을 열고 기간을 선택합니다.", "CSV, xls, xlsx 파일로 저장하거나 공유합니다."];

  return displaySteps.map((step) => ({
    title: step,
    description: "",
    detail: "",
  }));
}

function stripStepPrefix(step: string) {
  return step.replace(/^\s*\d+[.)]\s*/, "").trim();
}

type GuideStepsPanelProps = {
  eyebrow: string;
  title: string;
  steps: Step[];
  linkLabel: string;
  linkHref: string;
};

function GuideStepsPanel({ eyebrow, title, steps, linkLabel, linkHref }: GuideStepsPanelProps) {
  return (
    <SectionPanel
      title={title}
      eyebrow={eyebrow}
      action={
        linkHref ? (
          <a
            className="inline-flex h-8 items-center gap-1 rounded-lg border border-line bg-field px-3 text-sm font-medium text-ink transition-colors hover:bg-moss-soft"
            href={linkHref}
            target="_blank"
            rel="noreferrer"
          >
            <ExternalLink size={15} aria-hidden="true" />
            {linkLabel}
          </a>
        ) : null
      }
    >
      <ol className="grid gap-3">
        {steps.map((step, index) => (
          <li key={step.title} className="grid grid-cols-[36px_minmax(0,1fr)] gap-3 rounded-lg border border-line bg-field p-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-moss text-sm font-semibold text-white">
              {index + 1}
            </div>
            <div>
              <h3 className="font-semibold">{step.title}</h3>
              {step.description ? <p className="mt-1 text-sm leading-6 text-ink">{step.description}</p> : null}
              {step.detail ? <p className="mt-1 text-sm leading-6 text-muted">{step.detail}</p> : null}
            </div>
          </li>
        ))}
      </ol>
      <div className="mt-4 flex items-start gap-2 rounded-lg border border-line bg-moss-soft p-3 text-sm leading-6">
        <Download className="mt-0.5 shrink-0 text-moss" size={17} aria-hidden="true" />
        <p>
          가져오기용 파일은 화면 캡처나 PDF가 아니라 표 형태의 파일이어야 합니다. 파일명이 길어도 괜찮습니다.
        </p>
      </div>
    </SectionPanel>
  );
}
