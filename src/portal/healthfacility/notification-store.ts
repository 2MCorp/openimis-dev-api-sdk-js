import {
  HF_MUTATION_EVENT_TYPE,
  HF_UPDATE_EVENT_TYPE,
  type HfClaimLifecycleNotification,
  type HfMutationNotification,
  type HfUpdateEntity,
} from "../../event_bus/types";
import { parseHfClaimLifecycleData, parseHfMutationData } from "../../event_bus/parse";
import { createSseNotificationClient } from "../common/client/notifications/sse_client";

export type NotificationKind = "update" | "mutation";

export type HfNotification = {
  id: string;
  kind: NotificationKind;
  message: string;
  receivedAt: number;
  read: boolean;
  entity?: HfUpdateEntity;
  claimId?: string;
  claimCode?: string;
  preauthorizationId?: string;
  patientName?: string;
  patientChfId?: string;
  visitType?: string;
  status?: string;
};

/** Normalised fields of an SSE payload (from the SDK parsers). */
export type ParsedSsePayload = {
  message: string;
  entity?: HfUpdateEntity;
  claimId?: string;
  claimCode?: string;
  preauthorizationId?: string;
  patientName?: string;
  patientChfId?: string;
  visitType?: string;
  status?: string;
};

export const NOTIFICATION_STORAGE_KEY = "hf_portal_notifications";
export const MAX_NOTIFICATIONS = 50;
/** Collapse identical SSE deliveries (double listener / double save). */
export const NOTIFICATION_DEDUPE_WINDOW_MS = 15_000;

export function notificationFingerprint(parsed: ParsedSsePayload): string {
  return [
    parsed.entity ?? "",
    parsed.message.trim().toLowerCase(),
    parsed.preauthorizationId ?? "",
    parsed.claimId ?? "",
    parsed.claimCode ?? "",
    parsed.status ?? "",
  ].join("|");
}

/** Fix older stored items that lacked entity / used claimId for preauths. */
export function normalizeStoredNotification(item: HfNotification): HfNotification {
  const msg = item.message?.toLowerCase() ?? "";
  const looksPreauth =
    item.entity === "preauthorization" ||
    !!item.preauthorizationId ||
    msg.includes("pre-authorization") ||
    msg.includes("preauthorization");
  if (!looksPreauth) return item;

  const approved = item.status?.toUpperCase() === "A" || msg.includes("approved");
  const preauthorizationId =
    item.preauthorizationId ||
    // Older buggy stores put the preauth id into claimId (only when not approved+linked).
    (!approved && !item.claimCode ? item.claimId : undefined);

  return {
    ...item,
    entity: "preauthorization",
    preauthorizationId: preauthorizationId || item.preauthorizationId,
    claimId: item.claimId,
    claimCode: item.claimCode,
    visitType: item.visitType,
  };
}

export function fromClaimLifecycle(n: HfClaimLifecycleNotification): ParsedSsePayload {
  return {
    message: n.message,
    entity: n.entity,
    claimId: n.claimId,
    claimCode: n.claimCode,
    preauthorizationId: n.preauthorizationId,
    patientName: n.patientName,
    patientChfId: n.patientChfId,
    visitType: n.visitType,
    status: n.status,
  };
}

export function fromMutation(n: HfMutationNotification): ParsedSsePayload {
  return { message: n.message, entity: "claim", claimId: n.claimId, status: n.status };
}

type StorageLike = Pick<Storage, "getItem" | "setItem">;

function defaultStorage(): StorageLike | null {
  return typeof sessionStorage === "undefined" ? null : sessionStorage;
}

export type NotificationStoreState = {
  items: HfNotification[];
  connected: boolean;
};

/**
 * Framework-agnostic notification list (session-persisted, de-duplicated, capped).
 * `getSnapshot` / `subscribe` make it usable with React's `useSyncExternalStore`.
 */
export function createNotificationStore(
  options: { storage?: StorageLike | null; now?: () => number } = {},
) {
  const storage = options.storage === undefined ? defaultStorage() : options.storage;
  const now = options.now ?? Date.now;
  const listeners = new Set<() => void>();

  const load = (): HfNotification[] => {
    if (!storage) return [];
    try {
      const raw = storage.getItem(NOTIFICATION_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as HfNotification[];
      if (!Array.isArray(parsed)) return [];
      return parsed.slice(0, MAX_NOTIFICATIONS).map(normalizeStoredNotification);
    } catch {
      return [];
    }
  };

  let state: NotificationStoreState = { items: load(), connected: false };

  const emit = (next: NotificationStoreState, persist = false) => {
    state = next;
    if (persist && storage) {
      try {
        storage.setItem(
          NOTIFICATION_STORAGE_KEY,
          JSON.stringify(state.items.slice(0, MAX_NOTIFICATIONS)),
        );
      } catch {
        /* quota / private mode */
      }
    }
    for (const l of listeners) l();
  };

  const newId = () => `${now()}-${Math.random().toString(36).slice(2, 9)}`;

  return {
    getSnapshot: () => state,
    /** Stable empty state for server rendering. */
    getServerSnapshot: (): NotificationStoreState => EMPTY,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    /** Re-read sessionStorage (call once on the client after hydration). */
    rehydrate() {
      emit({ ...state, items: load() });
    },
    unreadCount: () => state.items.filter((n) => !n.read).length,
    /** Adds a notification; returns null for a duplicate delivery. */
    push(kind: NotificationKind, parsed: ParsedSsePayload): HfNotification | null {
      const fingerprint = notificationFingerprint(parsed);
      const t = now();
      const duplicate = state.items.find(
        (n) =>
          t - n.receivedAt < NOTIFICATION_DEDUPE_WINDOW_MS &&
          notificationFingerprint({
            message: n.message,
            entity: n.entity,
            claimId: n.claimId,
            claimCode: n.claimCode,
            preauthorizationId: n.preauthorizationId,
            status: n.status,
          }) === fingerprint,
      );
      if (duplicate) return null;
      const item: HfNotification = {
        id: newId(),
        kind,
        message: parsed.message,
        receivedAt: t,
        read: false,
        entity: parsed.entity,
        claimId: parsed.claimId,
        claimCode: parsed.claimCode,
        preauthorizationId: parsed.preauthorizationId,
        patientName: parsed.patientName,
        patientChfId: parsed.patientChfId,
        visitType: parsed.visitType,
        status: parsed.status,
      };
      emit({ ...state, items: [item, ...state.items].slice(0, MAX_NOTIFICATIONS) }, true);
      return item;
    },
    markRead(id: string) {
      emit({ ...state, items: state.items.map((n) => (n.id === id ? { ...n, read: true } : n)) }, true);
    },
    markAllRead() {
      emit({ ...state, items: state.items.map((n) => ({ ...n, read: true })) }, true);
    },
    clear() {
      emit({ ...state, items: [] }, true);
    },
    setConnected(connected: boolean) {
      if (state.connected !== connected) emit({ ...state, connected });
    },
  };
}

const EMPTY: NotificationStoreState = { items: [], connected: false };

export type NotificationStore = ReturnType<typeof createNotificationStore>;

/** The two same-origin SSE proxies of the HF portal, with their SDK parsers. */
export const HF_SSE_STREAMS = [
  {
    path: "/api/notifications/sse/updates",
    kind: "update" as const,
    eventNames: [HF_UPDATE_EVENT_TYPE],
    parse: (data: string): ParsedSsePayload | null => {
      const n = parseHfClaimLifecycleData(data);
      return n ? fromClaimLifecycle(n) : null;
    },
  },
  {
    path: "/api/notifications/sse/mutations",
    kind: "mutation" as const,
    eventNames: [HF_MUTATION_EVENT_TYPE],
    parse: (data: string): ParsedSsePayload | null => {
      const n = parseHfMutationData(data);
      return n ? fromMutation(n) : null;
    },
  },
];

/**
 * Live notification feed: opens both SSE proxies, feeds the store and calls `onNotification`
 * for each new (non-duplicate) item (toast, OS notification, ...). Browser only.
 */
export function createHfNotificationFeed(options: {
  store: NotificationStore;
  onNotification?: (item: HfNotification) => void;
}) {
  const client = createSseNotificationClient<NotificationKind, ParsedSsePayload>({
    streams: HF_SSE_STREAMS,
    onPayload: (kind, payload) => {
      const item = options.store.push(kind, payload);
      if (item) options.onNotification?.(item);
    },
    onConnectionChange: (connected) => options.store.setConnected(connected),
  });
  return client;
}
