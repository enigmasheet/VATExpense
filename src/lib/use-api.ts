"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api-client";

interface UseApiOptions<T> {
  onError?: (error: unknown) => void;
  initialData?: T | null;
}

/**
 * Fetches from a JSON API endpoint on mount and when the URL changes.
 *
 * Loading starts as `true` and is only cleared after the request settles,
 * avoiding synchronous state updates inside the effect.
 *
 * @param url - The endpoint to fetch, or `null` to skip fetching entirely
 * @param options - Optional `onError` callback and `initialData`
 * @returns The latest response body, loading flag, error message, and a reload function
 */
export function useApi<T>(url: string | null, options: UseApiOptions<T> = {}) {
  const [data, setData] = useState<T | null>(options.initialData ?? null);
  const [loading, setLoading] = useState(url !== null);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  const onErrorRef = useRef(options.onError);

  useEffect(() => {
    onErrorRef.current = options.onError;
  }, [options.onError]);

  useEffect(() => {
    if (!url) return;
    const controller = new AbortController();
    api<T>(url, { signal: controller.signal })
      .then((result) => {
        if (controller.signal.aborted) return;
        setData(result);
        setError(null);
        setLoading(false);
      })
      .catch((e: unknown) => {
        if (controller.signal.aborted) return;
        setError(e instanceof Error ? e.message : "Request failed");
        onErrorRef.current?.(e);
        setLoading(false);
      });
    return () => controller.abort();
  }, [url, nonce]);

  const reload = useCallback(() => {
    setLoading(true);
    setError(null);
    setNonce((n) => n + 1);
  }, []);

  return { data, loading, error, reload };
}