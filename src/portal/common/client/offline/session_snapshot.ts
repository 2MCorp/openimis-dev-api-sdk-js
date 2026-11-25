import type { PortalCache } from "../cache/portal_cache";
import { SESSION_SNAPSHOT_META_KEY, type RecentRecordBase } from "../cache/types";

/** After this long without the server confirming the session, offline entry is refused. */
export const MAX_OFFLINE_AGE_MS = 7 * 24 * 60 * 60_000;

/** Last successfully verified session, kept on the device so the cached app can open offline. */
export type SessionSnapshot<TUser extends { id: string }, TConfig = unknown> = {
  user: TUser;
  clientConfig: TConfig;
  /** When the server last confirmed this session (ms epoch). */
  lastVerifiedAt: number;
};

/** What `GET /api/session` returns: everything the app layout needs, minus the Knox token. */
export type SessionInfo<TUser extends { id: string }, TConfig = unknown> = {
  user: TUser;
  clientConfig: TConfig;
  /** Server session expiry (ms epoch). */
  expiresAt: number;
};

/** Persist/read the verified session in the cache DB's `meta` table. */
export function createSessionSnapshotStore<
  TUser extends { id: string },
  TConfig = unknown,
>(cache: Pick<PortalCache<string, RecentRecordBase>, "getDb">, maxAgeMs = MAX_OFFLINE_AGE_MS) {
  return {
    async save(info: Pick<SessionInfo<TUser, TConfig>, "user" | "clientConfig">): Promise<void> {
      const db = cache.getDb();
      if (!db) return;
      const value: SessionSnapshot<TUser, TConfig> = {
        user: info.user,
        clientConfig: info.clientConfig,
        lastVerifiedAt: Date.now(),
      };
      try {
        await db.meta.put({ key: SESSION_SNAPSHOT_META_KEY, value });
      } catch {
        /* storage unavailable or full: offline entry just won't be available */
      }
    },

    /** The snapshot, or null when absent or older than the offline limit (then deleted). */
    async read(now = Date.now()): Promise<SessionSnapshot<TUser, TConfig> | null> {
      const db = cache.getDb();
      if (!db) return null;
      try {
        const row = await db.meta.get(SESSION_SNAPSHOT_META_KEY);
        const snap = row?.value as SessionSnapshot<TUser, TConfig> | undefined;
        if (!snap?.user?.id || typeof snap.lastVerifiedAt !== "number") return null;
        if (now - snap.lastVerifiedAt > maxAgeMs) {
          await db.meta.delete(SESSION_SNAPSHOT_META_KEY);
          return null;
        }
        return snap;
      } catch {
        return null;
      }
    },

    async clear(): Promise<void> {
      const db = cache.getDb();
      if (!db) return;
      try {
        await db.meta.delete(SESSION_SNAPSHOT_META_KEY);
      } catch {
        /* ignore */
      }
    },
  };
}
