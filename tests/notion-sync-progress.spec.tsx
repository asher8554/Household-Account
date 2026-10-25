// Notion 백업 진행률의 대기·처리·완료·오류 표시와 접근성을 검증합니다.
/** @jsxImportSource react */
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "@playwright/test";
import { NotionSyncProgress, type NotionSyncState } from "../src/features/backup/NotionSyncProgress";

const progress = {
  version: 1 as const, syncedAt: "2026-10-25T00:00:00.000Z", transactions: 2538, categories: 40,
  processed: 240, created: 40, updated: 240, legacyRemoved: 0,
};
const render = (state: NotionSyncState) => renderToStaticMarkup(<NotionSyncProgress state={state} />);

test("shows an accessible percentage and counts from actual batch progress", () => {
  const html = render({ status: "running", progress });
  expect(html).toContain('role="progressbar"');
  expect(html).toContain('aria-valuenow="9"');
  expect(html).toContain('style="width:9%;opacity:1"');
  expect(html).toContain("240 / 2,538건 확인");
  expect(html).toContain("카테고리 40개");
  expect(html).toContain("새로 저장");
  expect(html).toContain("40건");
});

test("waits without inventing a percentage before the first response", () => {
  const html = render({ status: "running" });
  expect(html).toContain("응답 대기");
  expect(html).not.toContain("aria-valuenow=");
  expect(html).not.toContain("0 / 0건");
});

test("distinguishes duplicate checking from the reduced save workload", () => {
  const checking = render({ status: "running", progress: { ...progress, phase: "checking", skipped: 200 } });
  expect(checking).toContain("동일 기록 확인 중");
  expect(checking).toContain("동일 기록 200건 작업 제외");
  const complete = render({ status: "success", progress: { ...progress, phase: "saving", transactions: 0, categories: 0, skipped: 2578 } });
  expect(complete).toContain("추가·변경된 기록이 없어 저장 작업을 건너뛰었습니다.");
  expect(complete).toContain("동일 기록 2,578건 작업 제외");
  expect(complete).toContain('aria-valuenow="100"');
});

test("only confirmed completion shows 100 percent including an empty backup", () => {
  expect(render({ status: "running", progress: { ...progress, processed: 2538 } })).toContain('aria-valuenow="99"');
  expect(render({ status: "success", progress })).toContain('aria-valuenow="100"');
  expect(render({ status: "success", progress: { ...progress, transactions: 0, processed: 0 } })).toContain('aria-valuenow="100"');
});

test("preserves the last known percentage and explains network failures", () => {
  const html = render({ status: "error", progress, error: "Failed to fetch" });
  expect(html).toContain('aria-valuenow="9"');
  expect(html).toContain("Notion 기록 중단");
  expect(html).toContain("저장된 기록은 유지");
  expect(html).toContain('role="alert"');
  expect(render({ status: "error", error: "연결 실패" })).toContain('style="width:0%;opacity:0"');
});
