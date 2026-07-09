import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Lightweight cache for admin panel tab data.
 *
 * Each entry stores { data, fetchedAt, loading } keyed by a string ID.
 * `ttlMs` controls how long data is considered fresh (default 10 s, matching
 * the dashboard auto-refresh interval).  Switching to a tab whose cache is
 * stale triggers a refetch automatically; switching to a fresh tab is instant.
 *
 * After a mutation (create/edit/delete) callers should call `invalidate(key)`
 * so the next visit to that tab always gets fresh data.
 */
export function useAdminCache(fetchers, { ttlMs = 10_000 } = {}) {
  // cache: { [key]: { data: any, fetchedAt: number, loading: boolean } | null }
  const [cache, setCache] = useState(() =>
    Object.fromEntries(Object.keys(fetchers).map((k) => [k, null])),
  );

  // Keep a stable ref to the latest fetchers so the interval callback
  // always calls the current version without going stale.
  const fetchersRef = useRef(fetchers);
  useEffect(() => { fetchersRef.current = fetchers; });

  // Track which fetches are in-flight so we never double-fetch.
  const loadingRef = useRef(new Set());

  const fetchKey = useCallback(async (key) => {
    if (loadingRef.current.has(key)) return;
    loadingRef.current.add(key);
    // Mark as loading
    setCache((prev) => ({
      ...prev,
      [key]: prev[key] ? { ...prev[key], loading: true } : { data: null, fetchedAt: 0, loading: true },
    }));
    try {
      const data = await fetchersRef.current[key]();
      setCache((prev) => ({ ...prev, [key]: { data, fetchedAt: Date.now(), loading: false } }));
    } catch {
      // Leave stale data in place on error; mark loading as false.
      setCache((prev) => ({
        ...prev,
        [key]: prev[key] ? { ...prev[key], loading: false } : { data: null, fetchedAt: 0, loading: false },
      }));
    } finally {
      loadingRef.current.delete(key);
    }
  }, []);

  /**
   * Ensure the cache for `key` is fresh.  Fetches immediately if stale/missing.
   * Called whenever a tab becomes visible.
   */
  const ensureFresh = useCallback((key) => {
    const entry = cache[key];
    const isStale = !entry || Date.now() - entry.fetchedAt > ttlMs;
    if (isStale) fetchKey(key);
  }, [cache, fetchKey, ttlMs]);

  /**
   * Force-invalidate a cache entry so the next `ensureFresh` always refetches.
   * Call this after any mutation (create / edit / delete).
   */
  const invalidate = useCallback((key) => {
    setCache((prev) => ({ ...prev, [key]: null }));
  }, []);

  /**
   * Immediately refetch `key` regardless of freshness, and return the result.
   * Used by the manual refresh button and post-mutation reloads.
   */
  const refresh = useCallback((key) => fetchKey(key), [fetchKey]);

  /**
   * Refresh multiple keys in parallel.
   */
  const refreshAll = useCallback((...keys) => {
    return Promise.all((keys.length ? keys : Object.keys(fetchers)).map(fetchKey));
  }, [fetchers, fetchKey]);

  return { cache, ensureFresh, invalidate, refresh, refreshAll };
}
