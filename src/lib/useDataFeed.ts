"use client";

import { useState, useEffect, useCallback } from "react";

interface FeedState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  fetchedAt: string | null;
  refetch: () => void;
}

export function useDataFeed<T>(url: string): FeedState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);

  const doFetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(url, { cache: "no-store" });
      const json = await res.json();
      if (json.error && !json.items && !json.aircraft && !json.vessels && !json.markets && !json.provinces) {
        setError(json.error);
      }
      setData(json as T);
      setFetchedAt(json.fetchedAt || new Date().toISOString());
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    doFetch();
  }, [doFetch]);

  return { data, loading, error, fetchedAt, refetch: doFetch };
}
