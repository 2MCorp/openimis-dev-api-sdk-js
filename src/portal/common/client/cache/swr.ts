import type { PortalCache } from "./portal_cache";
import { hashPayload } from "./hash";
import type { CacheSettings, RecentRecordBase } from "./types";

export type SwrState<T> = {
  data: T | null;
  error: string | null;
  isLoading: boolean;
  isRevalidating: boolean;
};

export type SwrOptions<T, NS extends string> = {
  /** Full cache id including scope — return null to skip. */
  key: () => string | null;
  namespace: NS;
  scopeKey: () => string;
  fetcher: () => Promise<T>;
  /** Current cache settings (the app keeps them in React state / a store). */
  settings: () => CacheSettings<NS>;
  /** When false, skip caching but still fetch. Default true. */
  cacheEnabled?: () => boolean;
};

export type SwrController<T> = {
  getState(): SwrState<T>;
  /** Subscribe to state changes (`useSyncExternalStore` compatible). Returns unsubscribe. */
  subscribe(listener: () => void): () => void;
  /** Serve cache (stale ok) then revalidate; call when key/scope/settings change. */
  load(): Promise<void>;
  /** Bypass the cache read and refetch. */
  refresh(): Promise<void>;
  /** Set data directly (e.g. from a server-rendered payload) and write it to the cache. */
  seed(value: T): Promise<void>;
};

/**
 * Framework-agnostic stale-while-revalidate state machine over a `PortalCache`.
 * Reads IndexedDB first (when enabled), then revalidates via `fetcher`; a newer `load`/`refresh`
 * call supersedes older in-flight ones. Wrap it in a React hook with `useSyncExternalStore`.
 */
export function createSwrController<T, NS extends string, R extends RecentRecordBase>(
  cache: PortalCache<NS, R>,
  options: SwrOptions<T, NS>,
): SwrController<T> {
  let state: SwrState<T> = { data: null, error: null, isLoading: false, isRevalidating: false };
  let generation = 0;
  const listeners = new Set<() => void>();

  const set = (patch: Partial<SwrState<T>>) => {
    state = { ...state, ...patch };
    for (const l of listeners) l();
  };

  const allowCache = () =>
    (options.cacheEnabled?.() ?? true) &&
    cache.isNamespaceEnabled(options.settings(), options.namespace);

  async function seed(value: T): Promise<void> {
    set({ data: value });
    const id = options.key();
    if (!id || !allowCache()) return;
    await cache.setEntry(id, options.namespace, options.scopeKey(), value, options.settings().ttlMs);
  }

  async function run(force: boolean): Promise<void> {
    const id = options.key();
    if (!id) return;

    const gen = ++generation;
    const settings = options.settings();
    const useCache = allowCache();

    let hadCache = false;
    if (useCache && !force) {
      const entry = await cache.getEntry<T>(id);
      if (entry) {
        if (gen !== generation) return;
        // Fresh or stale: either way show it while revalidating.
        set({ data: entry.data });
        hadCache = true;
      }
    }

    set(hadCache ? { isRevalidating: true, error: null } : { isLoading: true, error: null });

    try {
      const fresh = await options.fetcher();
      if (gen !== generation) return;

      const prev = useCache ? await cache.getEntry<T>(id) : null;
      const changed = !prev || prev.hash !== hashPayload(fresh);
      if (changed || state.data == null) set({ data: fresh });
      if (useCache && changed) {
        await cache.setEntry(id, options.namespace, options.scopeKey(), fresh, settings.ttlMs);
      }
    } catch (err) {
      if (gen !== generation) return;
      set({
        error: err instanceof Error ? err.message : "Request failed",
        ...(hadCache ? {} : { data: null }),
      });
    } finally {
      if (gen === generation) set({ isLoading: false, isRevalidating: false });
    }
  }

  return {
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    load: () => run(false),
    refresh: () => run(true),
    seed,
  };
}
