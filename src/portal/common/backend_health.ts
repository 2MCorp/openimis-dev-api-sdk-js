export type BackendProbeOptions = {
  /** Developer API root (or a getter, so env can be read lazily). */
  baseUrl: string | (() => string);
  fetchImpl?: typeof fetch;
  now?: () => number;
  timeoutMs?: number;
  reachableTtlMs?: number;
  unreachableTtlMs?: number;
};

export type BackendProbe = {
  /** True when the backend answered any HTTP response; cached briefly. */
  isReachable(): Promise<boolean>;
  /** Forget the cached probe (tests). */
  reset(): void;
};

/**
 * Any HTTP response (even 401/404/500) means the backend is up; only a network failure or
 * timeout counts as unreachable. The result is cached briefly so each request stays cheap.
 * Keep one probe per process (module-level) in the app.
 */
export function createBackendProbe(options: BackendProbeOptions): BackendProbe {
  const {
    fetchImpl = (...args: Parameters<typeof fetch>) => fetch(...args),
    now = Date.now,
    timeoutMs = 3000,
    reachableTtlMs = 5000,
    unreachableTtlMs = 2000,
  } = options;
  let last: { reachable: boolean; at: number } | null = null;

  return {
    async isReachable() {
      const t = now();
      if (last) {
        const ttl = last.reachable ? reachableTtlMs : unreachableTtlMs;
        if (t - last.at < ttl) return last.reachable;
      }
      const base =
        typeof options.baseUrl === "function" ? options.baseUrl() : options.baseUrl;
      let reachable = true;
      try {
        await fetchImpl(`${base}/`, { method: "GET", signal: AbortSignal.timeout(timeoutMs) });
      } catch {
        reachable = false;
      }
      last = { reachable, at: now() };
      return reachable;
    },
    reset() {
      last = null;
    },
  };
}
