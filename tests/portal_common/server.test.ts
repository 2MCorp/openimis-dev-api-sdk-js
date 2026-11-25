import { describe, expect, it, vi } from "vitest";
import { ApiResponse } from "../../src/types";
import {
  apiFail,
  buildQueryString,
  createBackendProbe,
  createSdk,
  fromBackendResult,
  fromSdkResponse,
  getDeveloperApiBase,
  httpStatus,
  onlinePaymentsEnabled,
  pagingFromSearchParams,
  parseFhirPageOffset,
  parsePositiveInt,
  sdkFail,
  toUserFacingApiError,
} from "../../src/portal/common";
import {
  MAX_SESSION_COOKIE_BYTES,
  createSessionCodec,
  normalizeExpiry,
  sessionCookieOptions,
  type SessionData,
  type SessionUserBase,
} from "../../src/portal/common/server";

describe("toUserFacingApiError", () => {
  it("maps status codes to safe messages", () => {
    expect(toUserFacingApiError(401)).toMatch(/session has expired/);
    expect(toUserFacingApiError("403")).toMatch(/permission/);
    expect(toUserFacingApiError(504)).toMatch(/too long/);
    expect(toUserFacingApiError(0)).toMatch(/Unable to reach/);
    expect(toUserFacingApiError(500)).toMatch(/Something went wrong on the server/);
  });
  it("keeps short backend messages but drops HTML and tracebacks", () => {
    expect(toUserFacingApiError(400, "Insuree not found\nsecond line")).toBe("Insuree not found");
    expect(toUserFacingApiError(500, "<html><body>boom</body></html>")).toMatch(/server/);
    expect(toUserFacingApiError(500, "Traceback (most recent call last)")).toMatch(/server/);
    expect(toUserFacingApiError(400, "x".repeat(300))).toHaveLength(178);
  });
});

describe("envelopes", () => {
  const ok = (data: unknown) => ApiResponse.ok(data, 200);
  const bad = (code: number, message: string) => new ApiResponse<unknown>(false, message, String(code));

  it("maps a successful SDK response", () => {
    expect(fromSdkResponse(ok({ a: 1 }), (d: { a: number }) => d.a)).toEqual({
      status: 200,
      body: { success: true, data: 1 },
    });
  });
  it("uses the not-found message for 404 and sanitises other errors", () => {
    expect(fromSdkResponse(bad(404, "raw"), (d) => d, "Patient not found")).toEqual(
      apiFail(404, "Patient not found"),
    );
    expect(fromSdkResponse(bad(0, ""), (d) => d).status).toBe(502);
    expect(fromSdkResponse(bad(403, "x"), (d) => d).body).toEqual({
      success: false,
      error: "You do not have permission to perform this action.",
    });
  });
  it("sdkFail clamps the status", () => {
    expect(sdkFail({ statusCode: "200", message: "" }).status).toBe(502);
    expect(sdkFail({ statusCode: 422, message: "Bad date" })).toEqual(apiFail(422, "Bad date"));
  });
  it("fromBackendResult carries field errors on 400 and a custom success status", () => {
    const failed = fromBackendResult({
      ok: false,
      status: 400,
      message: "Invalid",
      data: null,
      fieldErrors: { income: "required" },
    });
    expect(failed).toEqual({
      status: 400,
      body: { success: false, error: "Invalid", fieldErrors: { income: "required" } },
    });
    expect(fromBackendResult({ ok: true, status: 201, message: "", data: { id: 1 } }, { status: 201 })).toEqual({
      status: 201,
      body: { success: true, data: { id: 1 } },
    });
    expect(
      fromBackendResult({ ok: false, status: 404, message: "", data: null }, { notFoundMessage: "Gone" }).body,
    ).toEqual({ success: false, error: "Gone" });
  });
  it("httpStatus falls back for non-error codes", () => {
    expect(httpStatus({ status: 0 })).toBe(400);
    expect(httpStatus({ status: 409 })).toBe(409);
  });
});

describe("paging helpers", () => {
  it("parsePositiveInt floors, caps and falls back", () => {
    expect(parsePositiveInt("12.9", 10)).toBe(12);
    expect(parsePositiveInt("500", 10, 50)).toBe(50);
    expect(parsePositiveInt("-1", 10)).toBe(10);
    expect(parsePositiveInt(null, 7)).toBe(7);
    expect(parsePositiveInt("abc", 7)).toBe(7);
  });
  it("parseFhirPageOffset is 1-based", () => {
    expect(parseFhirPageOffset(null)).toBeUndefined();
    expect(parseFhirPageOffset("  ")).toBeUndefined();
    expect(parseFhirPageOffset("0")).toBeUndefined();
    expect(parseFhirPageOffset("3.7")).toBe(3);
  });
  it("pagingFromSearchParams and buildQueryString", () => {
    const p = new URLSearchParams("page-offset=2&_count=999");
    expect(pagingFromSearchParams(p)).toEqual({ pageOffset: 2, count: 50 });
    expect(buildQueryString({ a: 1, b: "", c: undefined, d: "x y" })).toBe("a=1&d=x+y");
  });
});

describe("env + sdk", () => {
  it("appends /developer_api once", () => {
    expect(getDeveloperApiBase("https://h/")).toBe("https://h/developer_api");
    expect(getDeveloperApiBase("https://h/developer_api")).toBe("https://h/developer_api");
  });
  it("onlinePaymentsEnabled only for the literal true", () => {
    expect(onlinePaymentsEnabled("true")).toBe(true);
    expect(onlinePaymentsEnabled("1")).toBe(false);
    expect(onlinePaymentsEnabled(undefined)).toBe(false);
  });
  it("createSdk builds an SDK instance with and without a token", () => {
    expect(createSdk("https://h/developer_api").auth).toBeDefined();
    expect(createSdk("https://h/developer_api", "tok", "PH1").formalSector).toBeDefined();
  });
});

describe("backend probe", () => {
  it("treats any response as reachable, caches, and re-probes after the TTL", async () => {
    let t = 0;
    const fetchImpl = vi.fn(async () => new Response("", { status: 500 }));
    const probe = createBackendProbe({ baseUrl: () => "https://h", fetchImpl, now: () => t });
    expect(await probe.isReachable()).toBe(true);
    expect(await probe.isReachable()).toBe(true);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    t = 6000;
    await probe.isReachable();
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });
  it("reports a network failure as unreachable with a short TTL", async () => {
    let t = 0;
    const fetchImpl = vi.fn(async () => {
      throw new TypeError("network");
    });
    const probe = createBackendProbe({ baseUrl: "https://h", fetchImpl, now: () => t });
    expect(await probe.isReachable()).toBe(false);
    t = 1000;
    expect(await probe.isReachable()).toBe(false);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    t = 2500;
    await probe.isReachable();
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    probe.reset();
  });
});

describe("normalizeExpiry", () => {
  it("handles seconds, milliseconds, numeric strings, ISO dates and junk", () => {
    expect(normalizeExpiry(1_700_000_000)).toBe(1_700_000_000_000);
    expect(normalizeExpiry(1_700_000_000_000)).toBe(1_700_000_000_000);
    expect(normalizeExpiry("1700000000")).toBe(1_700_000_000_000);
    expect(normalizeExpiry("2030-01-01T00:00:00Z")).toBe(Date.parse("2030-01-01T00:00:00Z"));
    expect(normalizeExpiry("nope", 1000)).toBe(1000 + 300_000);
    expect(normalizeExpiry(null, 1000)).toBe(1000 + 300_000);
  });
});

type EmployerUser = SessionUserBase & { policyHolders: { code: string }[] };

const user: EmployerUser = {
  id: "7",
  username: "jdoe",
  email: "j@example.org",
  lastName: "Doe",
  otherNames: "Jane",
  language: "en",
  emailVerified: true,
  permissions: ["api_auth.view_employees"],
  groups: [],
  policyHolders: [{ code: "PH1" }],
};

describe("session codec", () => {
  const codec = createSessionCodec<EmployerUser>({
    secret: "s3cret-for-tests",
    cookieName: "employer_session",
    normalizeUser: (u) => ({ ...u, policyHolders: u.policyHolders ?? [] }),
  });
  const session: SessionData<EmployerUser> = {
    accessToken: "knox",
    accessTokenExpires: Date.now() + 60_000,
    user,
  };

  it("round-trips a sealed session", async () => {
    const sealed = await codec.seal(session);
    expect(sealed.split(".")).toHaveLength(5);
    expect(await codec.unseal(sealed)).toEqual(session);
  });
  it("rejects a wrong secret, garbage and an expired session", async () => {
    const sealed = await codec.seal(session);
    const other = createSessionCodec<EmployerUser>({ secret: "different", cookieName: "x" });
    expect(await other.unseal(sealed)).toBeNull();
    expect(await codec.unseal("garbage")).toBeNull();
    const later = createSessionCodec<EmployerUser>({
      secret: "s3cret-for-tests",
      cookieName: "x",
      now: () => session.accessTokenExpires + 10,
    });
    expect(await later.unseal(sealed)).toBeNull();
  });
  it("fills defaults for fields missing from older cookies", async () => {
    const { policyHolders: _drop, ...legacy } = user;
    const sealed = await codec.seal({ ...session, user: legacy as EmployerUser });
    const back = await codec.unseal(sealed);
    expect(back?.user.policyHolders).toEqual([]);
    expect(back?.user.groups).toEqual([]);
  });
  it("refuses cookies above the browser limit", async () => {
    const big = { ...session, user: { ...user, permissions: Array.from({ length: 400 }, (_, i) => `perm_${i}_${"x".repeat(20)}`) } };
    await expect(codec.seal(big)).rejects.toThrow(/employer_session.*too large/);
    expect(MAX_SESSION_COOKIE_BYTES).toBe(3500);
  });
  it("sessionCookieOptions", () => {
    const opts = sessionCookieOptions(1_900_000_000_000, true);
    expect(opts).toMatchObject({ path: "/", httpOnly: true, secure: true, sameSite: "lax" });
    expect(opts.expires.getTime()).toBe(1_900_000_000_000);
  });
});
