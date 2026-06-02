// 앱 초기화와 최상위 화면 구성을 담당합니다.
import { useEffect } from "react";
import { AppShell } from "./AppShell";
import { DashboardScreen } from "../features/dashboard/DashboardScreen";
import { ensureDefaultCategories } from "../features/categories/category-service";

export function App() {
  useEffect(() => {
    void ensureDefaultCategories();
  }, []);

  return (
    <AppShell>
      <DashboardScreen />
    </AppShell>
  );
}
