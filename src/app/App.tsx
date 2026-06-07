// 앱 초기화와 최상위 화면 구성을 담당합니다.
import { useEffect, useState } from "react";
import { AppShell } from "./AppShell";
import { DashboardScreen } from "../features/dashboard/DashboardScreen";
import { AnnualTrendScreen } from "../features/dashboard/AnnualTrendScreen";
import { ensureDefaultCategories } from "../features/categories/category-service";
import { useTheme } from "../features/theme/theme-service";
import { secretImportHash, type AppView } from "./app-navigation";
import { ShinhanImportGuideScreen } from "../features/import-guide/ShinhanImportGuideScreen";
import { loadPublishedSharedData } from "../features/shared-data/shared-data-service";

export function App() {
  const { theme, toggleTheme } = useTheme();
  const [currentView, setCurrentView] = useState<AppView>(() => getInitialView());

  useEffect(() => {
    void ensureDefaultCategories().then(() => loadPublishedSharedData());
  }, []);

  useEffect(() => {
    function syncViewFromHash() {
      if (window.location.hash === secretImportHash) {
        setCurrentView("shinhan-import");
        return;
      }

      setCurrentView((view) => (view === "shinhan-import" ? "dashboard" : view));
    }

    window.addEventListener("hashchange", syncViewFromHash);
    syncViewFromHash();

    return () => window.removeEventListener("hashchange", syncViewFromHash);
  }, []);

  function handleChangeView(view: AppView) {
    setCurrentView(view);

    if (view !== "shinhan-import" && window.location.hash === secretImportHash) {
      window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
    }
  }

  function handleOpenAdminView() {
    setCurrentView("shinhan-import");

    if (window.location.hash !== secretImportHash) {
      window.location.hash = secretImportHash;
    }
  }

  return (
    <AppShell
      currentView={currentView}
      theme={theme}
      onChangeView={handleChangeView}
      onOpenAdminView={handleOpenAdminView}
      onToggleTheme={toggleTheme}
    >
      {currentView === "dashboard" ? <DashboardScreen /> : null}
      {currentView === "annual-trend" ? <AnnualTrendScreen /> : null}
      {currentView === "shinhan-import" ? <ShinhanImportGuideScreen /> : null}
    </AppShell>
  );
}

function getInitialView(): AppView {
  return window.location.hash === secretImportHash ? "shinhan-import" : "dashboard";
}
