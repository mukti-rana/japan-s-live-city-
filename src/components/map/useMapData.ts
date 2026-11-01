"use client";

import { useCallback, useEffect, useState } from "react";

interface Loaded<T> {
  key: string;
  data?: T;
  failed?: boolean;
}

// Answers are remembered for the life of the page, so turning a layer off and
// on again, or reopening a city, never asks the server a second time. Only
// retry() asks again.
const CACHE = new Map<string, unknown>();

// Loads one URL once it is wanted (null waits).
export function useLazyJson<T>(url: string | null) {
  const [state, setState] = useState<Loaded<T> | null>(null);
  const [attempt, setAttempt] = useState(0);
  const cached = url ? (CACHE.get(url) as T | undefined) : undefined;

  useEffect(() => {
    if (!url || CACHE.has(url)) return;
    const controller = new AbortController();
    fetch(url, { signal: controller.signal })
      .then((r) => (r.ok ? (r.json() as Promise<T>) : Promise.reject(new Error("failed"))))
      .then((data) => {
        CACHE.set(url, data);
        setState({ key: url, data });
      })
      .catch((error: unknown) => {
        if ((error as { name?: string })?.name !== "AbortError") setState({ key: url, failed: true });
      });
    return () => controller.abort();
  }, [url, attempt]);

  const current = state && state.key === url ? state : null;
  const data = cached ?? current?.data ?? null;
  const retry = useCallback(() => {
    if (url) CACHE.delete(url);
    setState(null);
    setAttempt((n) => n + 1);
  }, [url]);
  return { data, failed: !data && Boolean(current?.failed), loading: url !== null && !data && !current, retry };
}
