// Dexie liveQuery를 React 상태로 구독하는 작은 훅입니다.
import { liveQuery } from "dexie";
import { useEffect, useState } from "react";

type LiveQueryState<T> = {
  data: T;
  error: unknown;
  isLoading: boolean;
};

export function useLiveQuery<T>(
  query: () => T | Promise<T>,
  dependencies: ReadonlyArray<unknown>,
  initialData: T,
): LiveQueryState<T> {
  const [state, setState] = useState<LiveQueryState<T>>({
    data: initialData,
    error: null,
    isLoading: true,
  });

  useEffect(() => {
    const subscription = liveQuery(query).subscribe({
      next: (data) => setState({ data, error: null, isLoading: false }),
      error: (error) => setState((previous) => ({ ...previous, error, isLoading: false })),
    });

    return () => subscription.unsubscribe();
    // Dexie query factories are intentionally controlled by the explicit dependency list.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies);

  return state;
}
