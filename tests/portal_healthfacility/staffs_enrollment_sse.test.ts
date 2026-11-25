import { describe, expect, it, vi } from "vitest";
import {
  buildFacilityData,
  buildHfSseUpstream,
  extractEnrollmentUuid,
  handleAccountClaim,
  handleEnrollmentList,
  handleEnrollmentRegister,
  handleStaffCreate,
  handleStaffUpdate,
  handleStaffsList,
  loadEnrollmentRegisterData,
  loadEnrollmentStatus,
  loadStaffPage,
  proxyHfSse,
  submitCreateStaff,
  submitEnrollmentClaim,
  submitEnrollmentRegister,
  submitUpdateStaff,
  sseUpstreamErrorStatus,
  validateWith,
  createStaffSchema,
  updateStaffSchema,
  HF_UPDATE_SSE_PATH,
} from "../../src/portal/healthfacility";
import { createMockSdk } from "./helpers";

const HF = "/health-facility-dev-api";
const ENR = "/enrollment/health-facility";
const admin = { permissions: ["api_auth.manage_hf_staff"] };

const staffFhir = (over: Record<string, unknown> = {}) => ({
  resourceType: "PractitionerRole",
  id: "s1",
  active: true,
  identifier: [{ system: "urn:ietf:rfc:3986", value: "s1" }],
  practitioner: { display: "Jane Roe" },
  code: [{ coding: [{ code: "ADMIN" }] }],
  ...over,
});

describe("staff handlers", () => {
  it("forbids non-managers before touching the backend", async () => {
    const { http, sdk } = createMockSdk();
    const res = await handleStaffsList(sdk, { permissions: [] });
    expect(res).toEqual({ status: 403, body: { success: false, error: "You do not have permission to manage staff." } });
    expect((await handleStaffCreate(sdk, {}, {})).status).toBe(403);
    expect((await handleStaffUpdate(sdk, {}, "1", {})).status).toBe(403);
    expect(http.calls).toHaveLength(0);
  });

  it("lists staff as plain items", async () => {
    const { http, sdk } = createMockSdk();
    http.on("GET", `${HF}/staffs/`, { resourceType: "Bundle", type: "searchset", total: 1, entry: [{ resource: staffFhir() }] });
    const res = await handleStaffsList(sdk, admin);
    expect(res.body).toMatchObject({ success: true, data: [{ id: "s1", displayName: "Jane Roe", role: "ADMIN", active: true }] });
  });

  it("validates create payloads and returns 201", async () => {
    const { http, sdk } = createMockSdk();
    expect((await handleStaffCreate(sdk, admin, { username: "u", email: "bad", password: "password1" })).body).toEqual({
      success: false,
      error: "Valid email is required",
    });
    http.on("POST", `${HF}/staffs/`, staffFhir());
    const res = await handleStaffCreate(sdk, admin, { username: "u", email: "u@x.org", password: "password1" });
    expect(res.status).toBe(201);
    expect(http.lastCall?.body).toMatchObject({ username: "u", role: "STAFF" });
  });

  it("patches role and active, requiring an id", async () => {
    const { http, sdk } = createMockSdk();
    expect((await handleStaffUpdate(sdk, admin, null, {})).body).toEqual({ success: false, error: "Staff id is required" });
    expect((await handleStaffUpdate(sdk, admin, "s1", { role: "BOSS", active: true })).body).toEqual({
      success: false,
      error: "Select a valid role",
    });
    http.on("PATCH", `${HF}/staffs/s1/`, staffFhir({ active: false }));
    const res = await handleStaffUpdate(sdk, admin, "s1", { role: "STAFF", active: "off" });
    expect(res.status).toBe(200);
    expect(http.lastCall?.body).toMatchObject({ role: "STAFF", active: false });
  });

  it("page helpers surface field errors and 404s", async () => {
    const { http, sdk } = createMockSdk();
    const bad = await submitCreateStaff(sdk, { username: "", email: "x", password: "1" });
    expect(bad).toMatchObject({
      ok: false,
      status: 400,
      errors: { username: "Username is required", email: "Valid email is required", password: "Password must be 8+ characters" },
    });
    http.onError("GET", `${HF}/staffs/zz/`, 404, "no such staff");
    expect(await loadStaffPage(sdk, "zz")).toEqual({ ok: false, status: 404, message: "no such staff" });
    http.onError("PATCH", `${HF}/staffs/s1/`, 400, "Cannot deactivate yourself");
    expect(await submitUpdateStaff(sdk, "s1", { role: "ADMIN", active: "true" })).toEqual({
      ok: false,
      status: 400,
      message: "Cannot deactivate yourself",
    });
  });

  it("validateWith reports the first message and per-field errors", () => {
    const r = validateWith(updateStaffSchema, { role: "x", active: true });
    expect(r).toMatchObject({ success: false, message: "Select a valid role", fieldErrors: { role: "Select a valid role" } });
    expect(validateWith(createStaffSchema, { username: "u", email: "u@x.org", password: "password1" })).toMatchObject({
      success: true,
      data: { role: "STAFF" },
    });
  });
});

describe("enrollment", () => {
  const regs = [{ uuid: "r1", status: "PENDING", facility_data: { code: "HF1", name: "Clinic" }, date_created: "2024-01-01" }];
  const claims = { results: [{ uuid: "c1", status: "APPROVED", claim_data: { facility_code: "HF2" } }] };

  it("summarises registrations and claims; failing lists contribute nothing", async () => {
    const { http, sdk } = createMockSdk();
    http.on("GET", `${ENR}/registration/`, regs);
    http.on("GET", `${ENR}/account-claim/`, claims);
    const res = await handleEnrollmentList(sdk);
    expect(res.body).toEqual({
      success: true,
      data: [
        { uuid: "r1", status: "PENDING", kind: "registration", summary: "HF1 — Clinic", dateCreated: "2024-01-01" },
        { uuid: "c1", status: "APPROVED", kind: "account_claim", summary: "Claim: HF2", dateCreated: undefined },
      ],
    });
    const { http: h2, sdk: s2 } = createMockSdk();
    h2.onError("GET", `${ENR}/registration/`, 500, "x");
    h2.on("GET", `${ENR}/account-claim/`, claims);
    const partial = await handleEnrollmentList(s2);
    if (!partial.body.success) throw new Error("x");
    expect(partial.body.data).toHaveLength(1);
  });

  it("reports only open submissions on the status page", async () => {
    const { http, sdk } = createMockSdk();
    http.on("GET", `${ENR}/registration/`, regs);
    http.on("GET", `${ENR}/account-claim/`, claims);
    const status = await loadEnrollmentStatus(sdk);
    expect(status.hasOpenSubmission).toBe(true);
    expect(status.pending.map((p) => p.uuid)).toEqual(["r1"]);
    expect((await loadEnrollmentRegisterData(sdk))).toEqual({ blocked: true });
  });

  it("registers then submits, building facility_data without empty optionals", async () => {
    const { http, sdk } = createMockSdk();
    http.on("POST", `${ENR}/registration/`, { uuid: "new-1", status: "DRAFT" }, { statusCode: 201 });
    http.on("POST", `${ENR}/registration/new-1/submit/`, { success: true, message: "submitted" });
    const bad = await handleEnrollmentRegister(sdk, { name: "", level: "X" });
    expect(bad.body).toEqual({ success: false, error: "Facility name is required" });
    const res = await handleEnrollmentRegister(sdk, {
      name: "Clinic",
      level: "C",
      location_id: "5",
      care_type: "O",
      phone: "123",
    });
    expect(res.status).toBe(201);
    const registerCall = http.calls.find((c) => c.path.endsWith("/registration/"))!;
    expect(registerCall.body).toEqual({
      facility_data: { name: "Clinic", level: "C", location_id: "5", care_type: "O", phone: "123" },
      notes: "",
      submitted_by_type: "SELF",
      self_enrollemnt_type: "HEALTH_FACILITY",
    });
    expect(http.lastCall?.path).toContain("/new-1/submit/");
  });

  it("fails with 502 when registration returns no uuid", async () => {
    const { http, sdk } = createMockSdk();
    http.on("POST", `${ENR}/registration/`, { status: "DRAFT" });
    const res = await handleEnrollmentRegister(sdk, { name: "C", level: "C", location_id: "5", care_type: "O" });
    expect(res).toEqual({ status: 502, body: { success: false, error: "Registration created but no uuid returned." } });
  });

  it("claims an account with auto_submit and blocks forms while a submission is open", async () => {
    const { http, sdk } = createMockSdk();
    http.on("POST", `${ENR}/account-claim/`, { message: "ok" }, { statusCode: 201 });
    expect((await handleAccountClaim(sdk, { facility_code: "" })).body).toEqual({ success: false, error: "Facility code is required" });
    const res = await handleAccountClaim(sdk, { facility_code: "HF9", notes: "n" });
    expect(res.status).toBe(201);
    expect(http.lastCall?.body).toEqual({ facility_code: "HF9", notes: "n", auto_submit: true });

    const open = createMockSdk();
    open.http.on("GET", `${ENR}/registration/`, regs);
    open.http.on("GET", `${ENR}/account-claim/`, []);
    const blocked = await submitEnrollmentClaim(open.sdk, { facility_code: "X" });
    expect(blocked).toMatchObject({ ok: false, status: 400, message: expect.stringContaining("open facility submission") });
    expect(await submitEnrollmentRegister(open.sdk, {})).toMatchObject({ ok: false });

    const free = createMockSdk();
    free.http.on("GET", `${ENR}/registration/`, []);
    free.http.on("GET", `${ENR}/account-claim/`, []);
    expect(await submitEnrollmentClaim(free.sdk, { facility_code: "" })).toMatchObject({
      ok: false,
      errors: { facility_code: "Facility code is required" },
    });
  });

  it("extracts uuids from several shapes", () => {
    expect(extractEnrollmentUuid({ uuid: " a " })).toBe("a");
    expect(extractEnrollmentUuid({ data: { id: "b" } })).toBe("b");
    expect(extractEnrollmentUuid({ data: [] })).toBeNull();
    expect(extractEnrollmentUuid(null)).toBeNull();
    expect(buildFacilityData({ name: "n", level: "C", location_id: "1", care_type: "I", legal_form_id: "2", email: "" })).toEqual({
      name: "n",
      level: "C",
      location_id: "1",
      care_type: "I",
      legal_form_id: "2",
    });
  });
});

describe("sse proxy", () => {
  it("builds upstream headers incl. Last-Event-ID", () => {
    expect(buildHfSseUpstream({ developerApiBase: "http://h/developer_api", upstreamPath: HF_UPDATE_SSE_PATH, accessToken: "t", lastEventId: "9" })).toEqual({
      url: `http://h/developer_api${HF_UPDATE_SSE_PATH}`,
      headers: { Authorization: "Token t", Accept: "text/event-stream", "Last-Event-ID": "9" },
    });
    expect(sseUpstreamErrorStatus(404)).toBe(404);
    expect(sseUpstreamErrorStatus(200)).toBe(502);
  });

  it("proxies the stream, rejects missing sessions and maps upstream failures", async () => {
    const req = new Request("http://app/api/notifications/sse/updates", { headers: { "Last-Event-ID": "3" } });
    const base = { developerApiBase: "http://h/developer_api", upstreamPath: HF_UPDATE_SSE_PATH };
    expect((await proxyHfSse(req, { ...base, accessToken: undefined })).status).toBe(401);

    const fetchImpl = vi.fn(async () => new Response("data: x\n\n", { status: 200 }));
    const ok = await proxyHfSse(req, { ...base, accessToken: "t", fetchImpl });
    expect(ok.status).toBe(200);
    expect(ok.headers.get("content-type")).toBe("text/event-stream");
    expect(await ok.text()).toBe("data: x\n\n");
    expect((fetchImpl.mock.calls[0] as unknown as [string, RequestInit])[1].headers).toMatchObject({ "Last-Event-ID": "3" });

    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const down = await proxyHfSse(req, { ...base, accessToken: "t", fetchImpl: async () => new Response("no", { status: 503 }) });
    expect(down.status).toBe(503);
    const boom = await proxyHfSse(req, { ...base, accessToken: "t", fetchImpl: async () => { throw new Error("x"); } });
    expect(boom.status).toBe(502);
    spy.mockRestore();
  });
});
