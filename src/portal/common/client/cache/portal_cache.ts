import Dexie, { type EntityTable, type Table } from "dexie";
import { hashPayload } from "./hash";
import {
  DEFAULT_CACHE_TTL_MS,
  EMPLOYER_CACHE_NAMESPACES,
  HF_CACHE_NAMESPACES,
  type RecentMemberRecord,
  type RecentPatientRecord,
  SESSION_SNAPSHOT_META_KEY,
  type CacheEntry,
  type CacheSettings,
  type MetaRecord,
  type RecentRecordBase,
} from "./types";

export type PortalCacheConfig<NS extends string> = {
  /** IndexedDB database name, e.g. `hf_portal_cache`. */
  dbName: string;
  /** All cache namespaces of the portal (see `HF_CACHE_NAMESPACES`). */
  namespaces: readonly NS[];
  /** Dexie table that holds "recently opened" rows (`recent_patients` / `recent_members`). */
  recentTable: string;
  /** localStorage key for the synchronous copy of the settings. */
  settingsStorageKey: string;
  defaultTtlMs?: number;
  /** Max rows kept in the recent table per scope. */
  maxRecent?: number;
};

type PortalDb = Dexie & {
  entries: EntityTable<CacheEntry, "id">;
  meta: EntityTable<MetaRecord, "key">;
  recent: Table<RecentRecordBase, string>;
};

export type PortalCache<NS extends string, R extends RecentRecordBase> = ReturnType<
  typeof createPortalCache<NS, R>
>;

const SETTINGS_META_KEY = "cache_settings";

export function isEntryStale(
  entry: Pick<CacheEntry, "ttl" | "updatedAt"> | undefined | null,
  now = Date.now(),
): boolean {
  if (!entry) return true;
  if (!entry.ttl) return false;
  return now - entry.updatedAt > entry.ttl;
}

/**
 * Browser-only IndexedDB (Dexie) cache for one portal: TTL'd entries per namespace and scope,
 * a "recently opened" table, cache settings and a `meta` table. Every operation degrades to
 * a no-op / empty result when IndexedDB is unavailable (SSR, private mode).
 */
export function createPortalCache<NS extends string, R extends RecentRecordBase = RecentRecordBase>(
  config: PortalCacheConfig<NS>,
) {
  const maxRecent = config.maxRecent ?? 8;
  const defaultTtl = config.defaultTtlMs ?? DEFAULT_CACHE_TTL_MS;

  const defaultSettings = (): CacheSettings<NS> => ({
    enabled: true,
    ttlMs: defaultTtl,
    namespaces: Object.fromEntries(config.namespaces.map((ns) => [ns, true])) as Record<
      NS,
      boolean
    >,
  });

  let dbInstance: PortalDb | null = null;

  function getDb(): PortalDb | null {
    if (typeof indexedDB === "undefined") return null;
    if (!dbInstance) {
      const db = new Dexie(config.dbName);
      db.version(1).stores({
        entries: "id, namespace, scopeKey, updatedAt",
        [config.recentTable]: "id, scopeKey, updatedAt",
        meta: "key",
      });
      const view = db as PortalDb;
      view.recent = db.table(config.recentTable);
      dbInstance = view;
    }
    return dbInstance;
  }

  // ---- entries -----------------------------------------------------------------------

  async function getEntry<T = unknown>(id: string): Promise<CacheEntry<T, NS> | null> {
    const db = getDb();
    if (!db) return null;
    try {
      const entry = await db.entries.get(id);
      return (entry as CacheEntry<T, NS> | undefined) ?? null;
    } catch {
      return null;
    }
  }

  async function setEntry<T>(
    id: string,
    namespace: NS,
    scopeKey: string,
    data: T,
    ttlMs: number,
  ): Promise<CacheEntry<T, NS> | null> {
    const db = getDb();
    if (!db) return null;
    const entry: CacheEntry<T, NS> = {
      id,
      namespace,
      scopeKey,
      data,
      updatedAt: Date.now(),
      ttl: ttlMs,
      hash: hashPayload(data),
    };
    try {
      await db.entries.put(entry as CacheEntry);
      return entry;
    } catch {
      return null;
    }
  }

  async function deleteEntry(id: string): Promise<void> {
    const db = getDb();
    if (!db) return;
    try {
      await db.entries.delete(id);
    } catch {
      /* ignore */
    }
  }

  async function clearNamespace(namespace: NS, scopeKey?: string): Promise<number> {
    const db = getDb();
    if (!db) return 0;
    try {
      const rows = scopeKey
        ? await db.entries.where({ namespace, scopeKey }).toArray()
        : await db.entries.where("namespace").equals(namespace).toArray();
      await db.entries.bulkDelete(rows.map((r) => r.id));
      return rows.length;
    } catch {
      return 0;
    }
  }

  async function clearAllEntries(scopeKey?: string): Promise<number> {
    const db = getDb();
    if (!db) return 0;
    try {
      if (scopeKey) {
        const rows = await db.entries.where("scopeKey").equals(scopeKey).toArray();
        await db.entries.bulkDelete(rows.map((r) => r.id));
        const recent = await db.recent.where("scopeKey").equals(scopeKey).toArray();
        await db.recent.bulkDelete(recent.map((r) => r.id));
        return rows.length;
      }
      const count = await db.entries.count();
      await db.entries.clear();
      await db.recent.clear();
      return count;
    } catch {
      return 0;
    }
  }

  async function countEntriesByNamespace(scopeKey?: string): Promise<Record<NS, number>> {
    const result = Object.fromEntries(config.namespaces.map((ns) => [ns, 0])) as Record<
      NS,
      number
    >;
    const db = getDb();
    if (!db) return result;
    try {
      const rows = scopeKey
        ? await db.entries.where("scopeKey").equals(scopeKey).toArray()
        : await db.entries.toArray();
      for (const row of rows) {
        if (row.namespace in result) result[row.namespace as NS] += 1;
      }
    } catch {
      /* ignore */
    }
    return result;
  }

  /** Logout / rejected session: drop cached data, recents and the offline session snapshot. */
  async function wipe(): Promise<void> {
    const db = getDb();
    if (!db) return;
    try {
      await db.entries.clear();
      await db.recent.clear();
      await db.meta.delete(SESSION_SNAPSHOT_META_KEY);
    } catch {
      /* ignore */
    }
  }

  // ---- settings ----------------------------------------------------------------------

  function normalizeSettings(raw: unknown): CacheSettings<NS> {
    const base = defaultSettings();
    if (!raw || typeof raw !== "object") return base;
    const obj = raw as Partial<CacheSettings<NS>>;
    if (typeof obj.enabled === "boolean") base.enabled = obj.enabled;
    if (typeof obj.ttlMs === "number" && obj.ttlMs > 0) base.ttlMs = obj.ttlMs;
    if (obj.namespaces && typeof obj.namespaces === "object") {
      for (const ns of config.namespaces) {
        if (typeof obj.namespaces[ns] === "boolean") base.namespaces[ns] = obj.namespaces[ns];
      }
    }
    return base;
  }

  function readSettingsFromLocalStorage(): CacheSettings<NS> {
    if (typeof localStorage === "undefined") return defaultSettings();
    try {
      const raw = localStorage.getItem(config.settingsStorageKey);
      return raw ? normalizeSettings(JSON.parse(raw)) : defaultSettings();
    } catch {
      return defaultSettings();
    }
  }

  function writeSettingsToLocalStorage(settings: CacheSettings<NS>): void {
    if (typeof localStorage === "undefined") return;
    try {
      localStorage.setItem(config.settingsStorageKey, JSON.stringify(settings));
    } catch {
      /* ignore quota errors */
    }
  }

  async function loadSettings(): Promise<CacheSettings<NS>> {
    const fromLs = readSettingsFromLocalStorage();
    const db = getDb();
    if (!db) return fromLs;
    try {
      const row = await db.meta.get(SETTINGS_META_KEY);
      if (row?.value != null) {
        const settings = normalizeSettings(row.value);
        writeSettingsToLocalStorage(settings);
        return settings;
      }
      await db.meta.put({ key: SETTINGS_META_KEY, value: fromLs });
      return fromLs;
    } catch {
      return fromLs;
    }
  }

  async function saveSettings(settings: CacheSettings<NS>): Promise<CacheSettings<NS>> {
    const normalized = normalizeSettings(settings);
    writeSettingsToLocalStorage(normalized);
    const db = getDb();
    if (db) {
      try {
        await db.meta.put({ key: SETTINGS_META_KEY, value: normalized });
      } catch {
        /* ignore */
      }
    }
    return normalized;
  }

  /** Shallow-merge a patch (namespaces merged one level deeper) without saving. */
  function mergeSettings(
    current: CacheSettings<NS>,
    patch: Partial<Omit<CacheSettings<NS>, "namespaces">> & {
      namespaces?: Partial<Record<NS, boolean>>;
    },
  ): CacheSettings<NS> {
    return {
      ...current,
      ...patch,
      namespaces: { ...current.namespaces, ...(patch.namespaces ?? {}) } as Record<NS, boolean>,
    };
  }

  function isNamespaceEnabled(settings: CacheSettings<NS>, namespace: NS): boolean {
    return settings.enabled && settings.namespaces[namespace];
  }

  // ---- recent rows -------------------------------------------------------------------

  async function listRecent(scopeKey: string): Promise<R[]> {
    const db = getDb();
    if (!db) return [];
    try {
      const rows = await db.recent.where("scopeKey").equals(scopeKey).toArray();
      return (rows as R[]).sort((a, b) => b.updatedAt - a.updatedAt).slice(0, maxRecent);
    } catch {
      return [];
    }
  }

  /**
   * Upsert a recent row (id = `<scope>:recent:<key>`) and trim to the newest `maxRecent`.
   * `key` is the stable identity, e.g. CHF id or member id.
   */
  async function pushRecent(
    scopeKey: string,
    key: string,
    fields: Omit<R, "id" | "scopeKey" | "updatedAt">,
  ): Promise<R[]> {
    const db = getDb();
    if (!db) return [];
    const record = {
      ...fields,
      id: `${scopeKey}:recent:${key}`,
      scopeKey,
      updatedAt: Date.now(),
    } as unknown as R;
    try {
      await db.recent.put(record);
      const all = await db.recent.where("scopeKey").equals(scopeKey).toArray();
      const sorted = (all as R[]).sort((a, b) => b.updatedAt - a.updatedAt);
      const excess = sorted.slice(maxRecent);
      if (excess.length) await db.recent.bulkDelete(excess.map((r) => r.id));
      return sorted.slice(0, maxRecent);
    } catch {
      return [];
    }
  }

  async function clearRecent(scopeKey?: string): Promise<void> {
    const db = getDb();
    if (!db) return;
    try {
      if (scopeKey) {
        const rows = await db.recent.where("scopeKey").equals(scopeKey).toArray();
        await db.recent.bulkDelete(rows.map((r) => r.id));
      } else {
        await db.recent.clear();
      }
    } catch {
      /* ignore */
    }
  }

  /**
   * Drop a recent row by its key; `alsoMatch` additionally removes rows in the scope that
   * match (e.g. same CHF id stored under another key).
   */
  async function removeRecent(
    scopeKey: string,
    key: string,
    alsoMatch?: (row: R) => boolean,
  ): Promise<void> {
    const db = getDb();
    if (!db) return;
    try {
      await db.recent.delete(`${scopeKey}:recent:${key}`);
      if (alsoMatch) {
        const rows = await db.recent.where("scopeKey").equals(scopeKey).toArray();
        const stale = (rows as R[]).filter(alsoMatch).map((r) => r.id);
        if (stale.length) await db.recent.bulkDelete(stale);
      }
    } catch {
      /* ignore */
    }
  }

  return {
    config,
    getDb,
    isAvailable: () => typeof indexedDB !== "undefined",
    defaultSettings,
    getEntry,
    setEntry,
    deleteEntry,
    clearNamespace,
    clearAllEntries,
    countEntriesByNamespace,
    wipe,
    normalizeSettings,
    readSettingsFromLocalStorage,
    loadSettings,
    saveSettings,
    mergeSettings,
    isNamespaceEnabled,
    listRecent,
    pushRecent,
    clearRecent,
    removeRecent,
  };
}

/** HF portal cache (DB `hf_portal_cache`, table `recent_patients`). */
export function createHfCache() {
  return createPortalCache<(typeof HF_CACHE_NAMESPACES)[number], RecentPatientRecord>({
    dbName: "hf_portal_cache",
    namespaces: HF_CACHE_NAMESPACES,
    recentTable: "recent_patients",
    settingsStorageKey: "hf_portal_cache_settings",
  });
}

/** Employer portal cache (table `recent_members`). */
export function createEmployerCache() {
  return createPortalCache<(typeof EMPLOYER_CACHE_NAMESPACES)[number], RecentMemberRecord>({
    dbName: "employer_portal_cache",
    namespaces: EMPLOYER_CACHE_NAMESPACES,
    recentTable: "recent_members",
    settingsStorageKey: "employer_portal_cache_settings",
  });
}
