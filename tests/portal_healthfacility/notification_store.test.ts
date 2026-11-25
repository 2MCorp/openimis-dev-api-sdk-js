import { describe, expect, it } from "vitest";
import { createNotificationStore } from "../../src/portal/healthfacility/notification-store";

function memoryStorage() {
  const data = new Map<string, string>();
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
  };
}

describe("notification store", () => {
  it("pushes, dedupes within the window and persists", () => {
    let t = 1_000;
    const storage = memoryStorage();
    const store = createNotificationStore({ storage, now: () => t });
    const first = store.push("update", { message: "Claim approved", entity: "claim", claimId: "c1" });
    expect(first?.read).toBe(false);
    expect(store.push("update", { message: "claim APPROVED", entity: "claim", claimId: "c1" })).toBeNull();
    t += 20_000;
    expect(store.push("update", { message: "Claim approved", entity: "claim", claimId: "c1" })).not.toBeNull();
    expect(store.getSnapshot().items).toHaveLength(2);
    expect(store.unreadCount()).toBe(2);

    const reloaded = createNotificationStore({ storage, now: () => t });
    expect(reloaded.getSnapshot().items).toHaveLength(2);
  });

  it("marks read, clears, caps and tracks connection", () => {
    const store = createNotificationStore({ storage: memoryStorage() });
    const seen: number[] = [];
    store.subscribe(() => seen.push(store.getSnapshot().items.length));
    const a = store.push("mutation", { message: "m1" })!;
    store.markRead(a.id);
    expect(store.unreadCount()).toBe(0);
    store.setConnected(true);
    expect(store.getSnapshot().connected).toBe(true);
    for (let i = 0; i < 60; i++) store.push("update", { message: `n${i}` });
    expect(store.getSnapshot().items).toHaveLength(50);
    store.clear();
    expect(store.getSnapshot().items).toHaveLength(0);
    expect(seen.length).toBeGreaterThan(3);
  });

  it("normalises legacy preauth items on load", () => {
    const storage = memoryStorage();
    storage.setItem(
      "hf_portal_notifications",
      JSON.stringify([{ id: "1", kind: "update", message: "Pre-authorization created", receivedAt: 1, read: false, claimId: "p9" }]),
    );
    const store = createNotificationStore({ storage });
    expect(store.getSnapshot().items[0]).toMatchObject({ entity: "preauthorization", preauthorizationId: "p9" });
  });
});
