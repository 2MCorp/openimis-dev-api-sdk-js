export const CACHE_TTL_OPTIONS = [
  { value: 15 * 60_000, labelKey: "cache_ttl_15m" },
  { value: 60 * 60_000, labelKey: "cache_ttl_1h" },
  { value: 24 * 60 * 60_000, labelKey: "cache_ttl_24h" },
  { value: 7 * 24 * 60 * 60_000, labelKey: "cache_ttl_7d" },
] as const;

export const DEFAULT_CACHE_TTL_MS = 24 * 60 * 60_000;

/** `meta` row holding the last verified session (see `createSessionSnapshotStore`). */
export const SESSION_SNAPSHOT_META_KEY = "session_snapshot";

/** Cache namespaces of the health-facility portal. */
export const HF_CACHE_NAMESPACES = [
  "dashboard",
  "patients",
  "encounters",
  "claims",
  "preauthorizations",
] as const;

/** Cache namespaces of the employer portal. */
export const EMPLOYER_CACHE_NAMESPACES = [
  "dashboard",
  "members",
  "contracts",
  "health_packages",
  "payments",
] as const;

export type CacheSettings<NS extends string = string> = {
  enabled: boolean;
  ttlMs: number;
  namespaces: Record<NS, boolean>;
};

export type CacheEntry<T = unknown, NS extends string = string> = {
  id: string;
  namespace: NS;
  scopeKey: string;
  data: T;
  updatedAt: number;
  ttl: number;
  hash: string;
};

export type MetaRecord = {
  key: string;
  value: unknown;
};

/** Minimum shape of a "recently opened" row; portals add their own fields. */
export type RecentRecordBase = {
  id: string;
  scopeKey: string;
  updatedAt: number;
};

/** HF recent-patient row. */
export type RecentPatientRecord = RecentRecordBase & {
  chfId: string;
  uuid?: string;
  fullName: string;
  gender?: string;
  birthDate?: string;
  photoUrl?: string;
  addressLine?: string;
};

/** Employer recent-member row. */
export type RecentMemberRecord = RecentRecordBase & {
  chfId: string;
  /** PolicyHolderInsuree UUID (member detail route id). */
  memberId: string;
  fullName: string;
  birthDate?: string;
  planName?: string;
};
