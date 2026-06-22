import { useEffect, useState } from "react";

export interface AsyncState<T> {
  loading: boolean;
  error: string | null;
  data: T | null;
}

/** Minimal data-fetching hook: runs `fn` on mount and when `deps` change. */
export function useAsync<T>(
  fn: () => Promise<T>,
  deps: unknown[],
): AsyncState<T> & { reload: () => void } {
  const [state, setState] = useState<AsyncState<T>>({
    loading: true,
    error: null,
    data: null,
  });
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let alive = true;
    setState((s) => ({ ...s, loading: true, error: null }));
    fn()
      .then((d) => {
        if (alive) setState({ loading: false, error: null, data: d });
      })
      .catch((e: unknown) => {
        if (alive)
          setState({
            loading: false,
            error: e instanceof Error ? e.message : "Gagal memuat data",
            data: null,
          });
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce]);

  return { ...state, reload: () => setNonce((n) => n + 1) };
}
