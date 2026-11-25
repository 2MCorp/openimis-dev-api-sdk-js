import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ApiClientError,
  EMPLOYER_CACHE_NAMESPACES,
  HF_CACHE_NAMESPACES,
  MAX_OFFLINE_AGE_MS,
  buildCacheId,
  createEmployerCache,
  createHfCache,
  createMissingIdStore,
  createSessionSnapshotStore,
  createSseNotificationClient,
  createSwrController,
  dashboardPath,
  detailPath,
  employerScopeKey,
  fetchApiJson,
  hashPayload,
  hfScopeKey,
  isEntryStale,
  isOffline,
  listPath,
  notificationHref,
  notificationSecondaryLabel,
  patientSearchPath,
  stableStringify,
} from "../../src/portal/common/client";

const hf = createHfCache();
const employer = createEmployerCache();

afterEach(async () => {
  await hf.wipe();
  await employer.wipe();
  vi.unstubAllGlobals();
});

describe("cache keys + hash", () => {
  it("builds scope keys per portal", () => {
    expect(hfScopeKey({ id: "u1", healthFacility: { id: "h1" } })).toBe("u:u1:hf:h1");
    expect(hfScopeKey(null)).toBe("u:anon:hf:none");
    expect(employerScopeKey({ id: "u1", policyHolder: { code: "PH" } })).toBe("u:u1:ph:PH");
  });
  it("builds ids and paths", () => {
    expect(buildCacheId("s", "claims", listPath())).toBe("s:claims:list:default");
    expect(listPath("a=1")).toBe("list:a=1");
    expect(detailPath("x")).toBe("detail:x");
    expect(dashboardPath(6, "month")).toBe("m6:gmonth");
    expect(patientSearchPath("  CHF1 ")).toBe("search:chf1");
  });
  it("hash ignores key order", () => {
    expect(stableStringify({ b: 1, a: { d: 1, c: 2 } })).toBe('{"a":{"c":2,"d":1},"b":1}');
    expect(hashPayload({ a: 1, b: 2 })).toBe(hashPayload({ b: 2, a: 1 }));
    expect(hashPayload({ a: 1 })).not.toBe(hashPayload({ a: 2 }));
  });
});

describe("portal cache entries", () => {
  it("round-trips, expires, counts and clears by namespace/scope", async () => {
    await hf.setEntry("s:claims:1", "claims", "s", { n: 1 }, 1000);
    await hf.setEntry("s:patients:1", "patients", "s", { n: 2 }, 0);
    await hf.setEntry("t:claims:1", "claims", "t", { n: 3 }, 1000);
    const entry = await hf.getEntry<{ n: number }>("s:claims:1");
    expect(entry?.data).toEqual({ n: 1 });
    expect(isEntryStale(entry, entry!.updatedAt + 1001)).toBe(true);
    expect(isEntryStale(entry, entry!.updatedAt + 10)).toBe(false);
    expect(isEntryStale(await hf.getEntry("s:patients:1"), Date.now() + 1e12)).toBe(false);
    expect(isEntryStale(null)).toBe(true);

    expect(await hf.countEntriesByNamespace("s")).toEqual({ dashboard: 0, patients: 1, encounters: 0, claims: 1, preauthorizations: 0 });
    expect(await hf.clearNamespace("claims", "s")).toBe(1);
    expect(await hf.getEntry("t:claims:1")).not.toBeNull();
    expect(await hf.clearAllEntries("t")).toBe(1);
    await hf.deleteEntry("s:patients:1");
    expect(await hf.getEntry("s:patients:1")).toBeNull();
  });
  it("uses a separate database per portal", async () => {
    await hf.setEntry("a", "dashboard", "s", 1, 0);
    expect(await employer.getEntry("a")).toBeNull();
    expect(employer.config.recentTable).toBe("recent_members");
    expect(HF_CACHE_NAMESPACES).toContain("claims");
    expect(EMPLOYER_CACHE_NAMESPACES).toContain("contracts");
  });
});

describe("recent rows", () => {
  it("keeps the newest 8 per scope, upserts, removes and clears", async () => {
    for (let i = 0; i < 10; i++) {
      await hf.pushRecent("s", `CHF${i}`, { chfId: `CHF${i}`, fullName: `P ${i}` });
      await new Promise((r) => setTimeout(r, 2));
    }
    const rows = await hf.listRecent("s");
    expect(rows).toHaveLength(8);
    expect(rows[0].chfId).toBe("CHF9");
    expect(rows.some((r) => r.chfId === "CHF0")).toBe(false);

    await hf.pushRecent("s", "CHF5", { chfId: "CHF5", fullName: "Renamed" });
    expect((await hf.listRecent("s"))[0].fullName).toBe("Renamed");

    await hf.removeRecent("s", "CHF9");
    expect((await hf.listRecent("s")).some((r) => r.chfId === "CHF9")).toBe(false);
    await hf.removeRecent("s", "gone", (r) => r.chfId === "CHF8");
    expect((await hf.listRecent("s")).some((r) => r.chfId === "CHF8")).toBe(false);

    await hf.clearRecent("s");
    expect(await hf.listRecent("s")).toEqual([]);
  });
  it("employer recent members", async () => {
    await employer.pushRecent("s", "m1", { chfId: "C", memberId: "m1", fullName: "M" });
    expect((await employer.listRecent("s"))[0].memberId).toBe("m1");
  });
});

describe("cache settings", () => {
  it("defaults, persists, merges and checks namespaces", async () => {
    const defaults = hf.defaultSettings();
    expect(defaults.enabled).toBe(true);
    expect(Object.keys(defaults.namespaces)).toEqual([...HF_CACHE_NAMESPACES]);
    expect(await hf.loadSettings()).toEqual(defaults);

    const next = hf.mergeSettings(defaults, { ttlMs: 5000, namespaces: { claims: false } });
    await hf.saveSettings(next);
    const loaded = await hf.loadSettings();
    expect(loaded.ttlMs).toBe(5000);
    expect(hf.isNamespaceEnabled(loaded, "claims")).toBe(false);
    expect(hf.isNamespaceEnabled(loaded, "patients")).toBe(true);
    expect(hf.normalizeSettings({ ttlMs: -1, enabled: "x" }).ttlMs).toBe(defaults.ttlMs);
  });
  it("mirrors settings into localStorage when available", async () => {
    const store = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
    });
    await hf.saveSettings({ ...hf.defaultSettings(), enabled: false });
    expect(JSON.parse(store.get("hf_portal_cache_settings")!).enabled).toBe(false);
    expect(hf.readSettingsFromLocalStorage().enabled).toBe(false);
  });
});

// Ported from the HF portal's session-snapshot spec.
describe("session snapshot", () => {
  const snapshots = createSessionSnapshotStore<{ id: string }, { money: string }>(hf);
  const info = { user: { id: "u-1" }, clientConfig: { money: "NGN" } };

  it("returns null when nothing was saved", async () => {
    expect(await snapshots.read()).toBeNull();
  });
  it("round-trips the user and client config with a verification time", async () => {
    const before = Date.now();
    await snapshots.save(info);
    const snap = await snapshots.read();
    expect(snap?.user.id).toBe("u-1");
    expect(snap?.clientConfig).toEqual(info.clientConfig);
    expect(snap?.lastVerifiedAt).toBeGreaterThanOrEqual(before);
  });
  it("refuses and deletes a snapshot older than the offline limit", async () => {
    await snapshots.save(info);
    expect(await snapshots.read(Date.now() + MAX_OFFLINE_AGE_MS + 1)).toBeNull();
    expect(await snapshots.read()).toBeNull();
  });
  it("is still valid just inside the offline limit", async () => {
    await snapshots.save(info);
    expect(await snapshots.read(Date.now() + MAX_OFFLINE_AGE_MS - 60_000)).not.toBeNull();
  });
  it("is removed by wipe (logout / rejected session) and by clear", async () => {
    await snapshots.save(info);
    await hf.wipe();
    expect(await snapshots.read()).toBeNull();
    await snapshots.save(info);
    await snapshots.clear();
    expect(await snapshots.read()).toBeNull();
  });
});

describe("missing id store", () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    vi.stubGlobal("sessionStorage", {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    });
  });
  it("remembers trimmed ids, caps entries and clears", () => {
    const missing = createMissingIdStore({ storageKey: "k", maxEntries: 2 });
    expect(missing.isMissing("A")).toBe(false);
    missing.markMissing(" A ");
    missing.markMissing("B");
    missing.markMissing("C");
    expect(missing.isMissing("A")).toBe(false);
    expect(missing.isMissing("C")).toBe(true);
    missing.markMissing("");
    missing.clear();
    expect(missing.isMissing("C")).toBe(false);
  });
});

describe("swr controller", () => {
  const settings = () => hf.defaultSettings();
  const make = (fetcher: () => Promise<{ v: number }>, extra: object = {}) =>
    createSwrController(hf, {
      key: () => buildCacheId("s", "claims", "list:default"),
      namespace: "claims",
      scopeKey: () => "s",
      fetcher,
      settings,
      ...extra,
    });

  it("fetches, caches, then serves cache while revalidating", async () => {
    const first = make(async () => ({ v: 1 }));
    await first.load();
    expect(first.getState()).toMatchObject({ data: { v: 1 }, isLoading: false });

    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    const states: boolean[] = [];
    const second = make(async () => {
      await gate;
      return { v: 2 };
    });
    second.subscribe(() => states.push(second.getState().isRevalidating));
    const pending = second.load();
    await new Promise((r) => setTimeout(r, 20));
    expect(second.getState()).toMatchObject({ data: { v: 1 }, isRevalidating: true });
    release();
    await pending;
    expect(second.getState()).toMatchObject({ data: { v: 2 }, isRevalidating: false });
    expect((await hf.getEntry<{ v: number }>("s:claims:list:default"))?.data).toEqual({ v: 2 });
    expect(states).toContain(true);
  });
  it("surfaces errors, and does not read the cache when disabled or refreshing", async () => {
    const failing = make(async () => {
      throw new Error("nope");
    }, { cacheEnabled: () => false });
    await failing.load();
    expect(failing.getState()).toMatchObject({ data: null, error: "nope", isLoading: false });

    await hf.setEntry("s:claims:list:default", "claims", "s", { v: 9 }, 0);
    const refreshed = make(async () => ({ v: 3 }));
    await refreshed.refresh();
    expect(refreshed.getState().data).toEqual({ v: 3 });
  });
  it("seed sets data and writes the cache", async () => {
    const c = make(async () => ({ v: 0 }));
    await c.seed({ v: 7 });
    expect(c.getState().data).toEqual({ v: 7 });
    expect((await hf.getEntry<{ v: number }>("s:claims:list:default"))?.data).toEqual({ v: 7 });
  });
});

describe("fetchApiJson", () => {
  const respond = (status: number, body: unknown) =>
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(body), { status })));

  it("returns data from a success envelope", async () => {
    respond(200, { success: true, data: { a: 1 } });
    expect(await fetchApiJson("/api/x")).toEqual({ a: 1 });
  });
  it("throws ApiClientError with the server message and field errors", async () => {
    respond(400, { success: false, error: "Bad", fieldErrors: { income: "req" } });
    const err = (await fetchApiJson("/api/x").catch((e) => e)) as ApiClientError;
    expect(err).toBeInstanceOf(ApiClientError);
    expect(err).toMatchObject({ message: "Bad", status: 400, fieldErrors: { income: "req" } });
  });
  it("flags not found / unauthorized and fires the session-expired event", async () => {
    const events: string[] = [];
    vi.stubGlobal("window", { dispatchEvent: (e: Event) => void events.push(e.type) });
    respond(401, { success: false, error: "expired" });
    const err = (await fetchApiJson("/x", undefined, { sessionExpiredEvent: "hf:session-expired" }).catch((e) => e)) as ApiClientError;
    expect(err.unauthorized).toBe(true);
    expect(events).toEqual(["hf:session-expired"]);
    respond(404, null);
    const nf = (await fetchApiJson("/x").catch((e) => e)) as ApiClientError;
    expect(nf.notFound).toBe(true);
    expect(nf.message).toBe("Request failed (404)");
  });
  it("maps network failures to the injected offline message, else rethrows", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => {
      throw new TypeError("Failed to fetch");
    }));
    const err = (await fetchApiJson("/x", undefined, { offlineMessage: () => "Needs connection" }).catch((e) => e)) as ApiClientError;
    expect(err).toMatchObject({ message: "Needs connection", status: 0 });
    await expect(fetchApiJson("/x")).rejects.toBeInstanceOf(TypeError);
  });
});

describe("connectivity", () => {
  it("isOffline combines browser status and the server fallback flag", () => {
    expect(isOffline()).toBe(false);
    expect(isOffline(true)).toBe(true);
    vi.stubGlobal("navigator", { onLine: false });
    expect(isOffline()).toBe(true);
  });
});

describe("notification helpers", () => {
  const uuid = "123e4567-e89b-12d3-a456-426614174000";
  it("routes claims, encounters and preauthorizations", () => {
    expect(notificationHref({ message: "m", claimId: "5" })).toBe("/claims/5");
    expect(notificationHref({ message: "m", claimId: "5", visitType: "C" })).toBe("/encounters/5");
    expect(notificationHref({ message: "Pre-authorization created", preauthorizationId: "p1" })).toBe("/pre_authorizations/p1");
    expect(notificationHref({ message: "Pre-authorization created" })).toBe("/pre_authorizations");
    expect(notificationHref({ message: "m", entity: "preauthorization", status: "A", claimId: "9" })).toBe("/claims/9");
    expect(notificationHref({ message: "m" })).toBeNull();
  });
  it("builds a secondary label without raw UUIDs", () => {
    expect(notificationSecondaryLabel({ message: "m", patientName: "Aisha", patientChfId: "CHF1", claimCode: "CLM-1" })).toBe("Aisha (CHF1) · CLM-1");
    expect(notificationSecondaryLabel({ message: "m", patientChfId: uuid, claimCode: uuid })).toBeNull();
    expect(notificationSecondaryLabel({ message: "m", claimId: "42" })).toBe("#42");
    expect(notificationSecondaryLabel({ message: "m", claimId: uuid })).toBeNull();
  });
});

describe("sse client", () => {
  class FakeEventSource {
    static all: FakeEventSource[] = [];
    onopen: (() => void) | null = null;
    onerror: (() => void) | null = null;
    closed = false;
    listeners = new Map<string, (ev: unknown) => void>();
    constructor(public url: string) {
      FakeEventSource.all.push(this);
    }
    addEventListener(name: string, fn: (ev: unknown) => void) {
      this.listeners.set(name, fn);
    }
    close() {
      this.closed = true;
    }
  }

  it("parses events per stream, tracks connection state and stops cleanly", () => {
    FakeEventSource.all = [];
    const payloads: [string, unknown][] = [];
    const connection: boolean[] = [];
    const client = createSseNotificationClient<"update" | "mutation", { raw: string }>({
      streams: [
        { path: "/u", kind: "update", eventNames: ["message"], parse: (d) => (d === "skip" ? null : { raw: d }) },
        { path: "/m", kind: "mutation", eventNames: ["mutation"], parse: (d) => ({ raw: d }) },
      ],
      onPayload: (k, p) => payloads.push([k, p]),
      onConnectionChange: (c) => connection.push(c),
      eventSourceFactory: (url) => new FakeEventSource(url) as unknown as EventSource,
    });
    client.start();
    client.start();
    expect(FakeEventSource.all.map((s) => s.url)).toEqual(["/u", "/m"]);

    const [u, m] = FakeEventSource.all;
    u.onopen?.();
    u.listeners.get("message")!({ data: "hello" });
    u.listeners.get("message")!({ data: "skip" });
    u.listeners.get("message")!({ data: "  " });
    m.listeners.get("mutation")!({ data: "x" });
    u.onerror?.();
    expect(payloads).toEqual([["update", { raw: "hello" }], ["mutation", { raw: "x" }]]);
    expect(connection).toEqual([true, false]);

    client.stop();
    expect(FakeEventSource.all.every((s) => s.closed)).toBe(true);
    expect(connection.at(-1)).toBe(false);
  });
});
