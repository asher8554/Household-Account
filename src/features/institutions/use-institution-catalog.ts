// React 화면에서 기관 카탈로그를 로드하고 새로고침 상태를 제공합니다.
import { useCallback, useEffect, useState } from "react";
import { fallbackInstitutionCatalog } from "./institution-fallbacks";
import { loadInstitutionCatalog } from "./institution-service";
import type { InstitutionCatalog } from "./institution-types";

const loadErrorMessage = "기관 목록을 불러오지 못했습니다.";

export function useInstitutionCatalog() {
  const [catalog, setCatalog] = useState<InstitutionCatalog>(fallbackInstitutionCatalog);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const nextCatalog = await loadInstitutionCatalog();
      setCatalog(nextCatalog);
      return nextCatalog;
    } catch {
      setError(loadErrorMessage);
      setCatalog(fallbackInstitutionCatalog);
      return fallbackInstitutionCatalog;
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    setIsLoading(true);
    setError(null);

    void loadInstitutionCatalog()
      .then((nextCatalog) => {
        if (!isMounted) {
          return;
        }

        setCatalog(nextCatalog);
      })
      .catch(() => {
        if (!isMounted) {
          return;
        }

        setError(loadErrorMessage);
        setCatalog(fallbackInstitutionCatalog);
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return {
    catalog,
    isLoading,
    error,
    refresh,
  };
}
