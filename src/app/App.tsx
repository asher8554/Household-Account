// 앱 초기화와 최상위 화면 구성을 담당합니다.
import { useEffect, useState } from "react";
import { AppShell } from "./AppShell";
import { DashboardScreen } from "../features/dashboard/DashboardScreen";
import { ensureDefaultCategories } from "../features/categories/category-service";
import { useTheme } from "../features/theme/theme-service";
import type { AppView } from "./app-navigation";
import { ShinhanImportGuideScreen } from "../features/import-guide/ShinhanImportGuideScreen";

export function App() {
  const { theme, toggleTheme } = useTheme();
  const [currentView, setCurrentView] = useState<AppView>("dashboard");

  useEffect(() => {
    void ensureDefaultCategories();
  }, []);

  return (
    <AppShell
      currentView={currentView}
      theme={theme}
      onChangeView={setCurrentView}
      onToggleTheme={toggleTheme}
    >
      {currentView === "dashboard" ? <DashboardScreen /> : <ShinhanImportGuideScreen />}
    </AppShell>
  );
}
