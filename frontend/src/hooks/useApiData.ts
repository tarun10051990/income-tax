"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiError } from "@/lib/api";

interface ApiDataState<T> {
  data: T | null;
  error: string | null;
  isLoading: boolean;
  reload: () => void;
}

/**
 * Loads data from the API on mount and whenever `deps` change, exposing a reload hook so
 * mutations elsewhere on the page can refresh the view.
 */
export function useApiData<T>(loader: () => Promise<T>, deps: unknown[] = []): ApiDataState<T> {
  const [reloadToken, setReloadToken] = useState(0);
  /** Identifies the request the current render wants; the result carries the key it came from. */
  const requestKey = `${reloadToken}|${JSON.stringify(deps)}`;
  const [result, setResult] = useState<{ key: string; data: T | null; error: string | null }>({
    key: "",
    data: null,
    error: null,
  });

  const reload = useCallback(() => setReloadToken((token) => token + 1), []);

  useEffect(() => {
    let cancelled = false;
    loader()
      .then((data) => {
        if (!cancelled) {
          setResult({ key: requestKey, data, error: null });
        }
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setResult({
            key: requestKey,
            data: null,
            error: cause instanceof ApiError ? cause.message : "Something went wrong. Please try again.",
          });
        }
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestKey]);

  return {
    data: result.data,
    error: result.error,
    isLoading: result.key !== requestKey,
    reload,
  };
}

export function errorMessage(cause: unknown): string {
  if (cause instanceof ApiError) {
    const details = cause.errors.map((error) => `${error.field}: ${error.message}`).join(", ");
    return details.length > 0 ? `${cause.message} (${details})` : cause.message;
  }
  return "Something went wrong. Please try again.";
}
