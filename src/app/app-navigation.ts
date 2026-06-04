// 앱 안에서 전환되는 최상위 화면 식별자를 정의합니다.
export type AppView = "dashboard" | "annual-trend" | "shinhan-import";

export const appViewLabels: Record<AppView, string> = {
  dashboard: "대시보드",
  "annual-trend": "연간 소비 추세",
  "shinhan-import": "금융기관 가져오기",
};
