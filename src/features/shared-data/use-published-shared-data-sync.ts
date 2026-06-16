// GitHub Pages 공유 데이터를 열린 브라우저 탭에 주기적으로 반영합니다.
import { useEffect } from "react";
import { ensureDefaultCategories } from "../categories/category-service";
import { loadPublishedSharedData } from "./shared-data-service";

export const publishedSharedDataRefreshIntervalMs = 60_000;
const minimumSharedDataSyncIntervalMs = 5_000;

export function usePublishedSharedDataSync() {
  useEffect(() => {
    let lastSyncStartedAt = 0;
    let isSyncing = false;

    async function syncPublishedSharedData(force = false) {
      const now = Date.now();

      if (isSyncing) return;
      if (!force && now - lastSyncStartedAt < minimumSharedDataSyncIntervalMs) return;

      isSyncing = true;
      lastSyncStartedAt = now;

      try {
        await ensureDefaultCategories();
        await loadPublishedSharedData();
      } finally {
        isSyncing = false;
      }
    }

    function refreshOnFocus() {
      void syncPublishedSharedData();
    }

    function refreshWhenVisible() {
      if (document.visibilityState === "visible") {
        void syncPublishedSharedData();
      }
    }

    void syncPublishedSharedData(true);
    window.addEventListener("focus", refreshOnFocus);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    const intervalId = window.setInterval(refreshWhenVisible, publishedSharedDataRefreshIntervalMs);

    return () => {
      window.removeEventListener("focus", refreshOnFocus);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
      window.clearInterval(intervalId);
    };
  }, []);
}
