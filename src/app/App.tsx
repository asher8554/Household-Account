// 앱 초기화와 최상위 화면 구성을 담당합니다.
import { useEffect } from "react";
import { AppShell } from "./AppShell";
import { DashboardScreen } from "../features/dashboard/DashboardScreen";
import { ensureDefaultCategories } from "../features/categories/category-service";
import { useTheme } from "../features/theme/theme-service";

export function App() {
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    void ensureDefaultCategories();
  }, []);

  return (
    <AppShell theme={theme} onToggleTheme={toggleTheme}>
      <DashboardScreen />
    </AppShell>
  );
}
