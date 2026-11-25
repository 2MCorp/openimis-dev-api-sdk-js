import { describe, expect, it } from "vitest";
import { offlineShellTarget, resolveHfOfflineRoute } from "../../src/portal/healthfacility/offline-routes";

describe("resolveHfOfflineRoute", () => {
  it("maps list and detail pages", () => {
    expect(resolveHfOfflineRoute("/")).toEqual({ kind: "dashboard" });
    expect(resolveHfOfflineRoute("/claims")).toEqual({ kind: "claims" });
    expect(resolveHfOfflineRoute("/claims/abc")).toEqual({ kind: "claim", id: "abc" });
    expect(resolveHfOfflineRoute("/claims/abc/edit")).toEqual({ kind: "claim-edit", id: "abc" });
    expect(resolveHfOfflineRoute("/encounters/edit/x1")).toEqual({ kind: "encounter-edit", id: "x1" });
    expect(resolveHfOfflineRoute("/pre_authorizations/9")).toEqual({ kind: "preauthorization", id: "9" });
    expect(resolveHfOfflineRoute("/patients/CHF%201")).toEqual({ kind: "patient", id: "CHF 1" });
  });
  it("flags server-only and auth screens", () => {
    expect(resolveHfOfflineRoute("/staffs")).toEqual({ kind: "server-only" });
    expect(resolveHfOfflineRoute("/staffs/3")).toEqual({ kind: "server-only" });
    expect(resolveHfOfflineRoute("/login")).toEqual({ kind: "needs-connection" });
    expect(resolveHfOfflineRoute("/enrollment/register")).toEqual({ kind: "needs-connection" });
  });
});

describe("offlineShellTarget", () => {
  it("accepts same-origin paths only", () => {
    expect(offlineShellTarget("/claims?x=1")).toBe("/claims?x=1");
    expect(offlineShellTarget("//evil.com")).toBeNull();
    expect(offlineShellTarget("https://evil.com")).toBeNull();
    expect(offlineShellTarget("/offline")).toBeNull();
    expect(offlineShellTarget(null)).toBeNull();
  });
});
