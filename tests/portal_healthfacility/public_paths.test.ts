import { describe, expect, it } from "vitest";
import { isHfPublicPath, unauthenticatedResponseKind } from "../../src/portal/healthfacility/public-paths";

describe("public paths", () => {
  it("allows the sign-in area, shell and assets", () => {
    for (const p of ["/login", "/offline", "/manifest.webmanifest", "/api/auth/verify/resend", "/icons/icon-192.png", "/sw.js"]) {
      expect(isHfPublicPath(p)).toBe(true);
    }
  });
  it("gates the app and API", () => {
    expect(unauthenticatedResponseKind("/claims")).toBe("login-redirect");
    expect(unauthenticatedResponseKind("/api/claims")).toBe("api-401");
    expect(unauthenticatedResponseKind("/login")).toBe("none");
    expect(isHfPublicPath("/api/session")).toBe(false);
  });
});

import { parseDashboardQuery } from "../../src/portal/healthfacility/client";
describe("dashboard query (client barrel)", () => {
  it("parses months and granularity", () => {
    expect(parseDashboardQuery(new URLSearchParams("months=99&granularity=day"))).toEqual({ months: 24, granularity: "day" });
    expect(parseDashboardQuery(new URLSearchParams(""))).toEqual({ months: 6, granularity: "month" });
  });
});
