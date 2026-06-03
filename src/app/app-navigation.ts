// 앱 안에서 전환되는 최상위 화면 식별자를 정의합니다.
export type AppView = "dashboard" | "shinhan-import";

export const appViewLabels: Record<AppView, string> = {
  dashboard: "대시보드",
  "shinhan-import": "금융기관 가져오기",
};
