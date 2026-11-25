import { describe, expect, it } from "vitest";
import {
  INVALID_JSON_BODY,
  handleCatalogDiagnoses,
  handleCatalogFacilities,
  handleCatalogItems,
  handleCatalogServices,
  handleClaimCreate,
  handleClaimGet,
  handleClaimUpdate,
  handleClaimsBulk,
  handleClaimsList,
  handleClaimsSubmit,
  handleClientConfig,
  handleEncounterCreate,
  handleEncounterUpdate,
  handleEncountersBulk,
  handleEncountersList,
  handleEncountersSubmit,
  handlePatientSearch,
  handlePreauthorizationCreate,
  handlePreauthorizationGet,
  handlePreauthorizationUpdate,
  handlePreauthorizationsBulk,
  handlePreauthorizationsList,
  handleSessionInfo,
  readBulkUploadInput,
  sessionFacilityCode,
  BULK_CSV_HEADERS,
} from "../../src/portal/healthfacility";
import { samplePatientFhir, sampleClaimFhir, samplePreauthFhir } from "../fixtures/samples";
import { searchBundle } from "../helpers/mockHttpClient";
import { createMockSdk, params } from "./helpers";

const HF = "/health-facility-dev-api";
const UUID = "22222222-2222-4222-8222-222222222222";

describe("claims handlers", () => {
  it("lists claims, enriching patient names and clamping paging", async () => {
    const { http, sdk } = createMockSdk();
    http.on("GET", `${HF}/claims/`, searchBundle("Claim", [sampleClaimFhir()]));
    http.on("GET", `${HF}/search-patient/`, samplePatientFhir());
    const res = await handleClaimsList(sdk, params({ _count: "500", "page-offset": "0", refDate: "2024-01-01", status: "entered" }));
    expect(res.status).toBe(200);
    if (!res.body.success) throw new Error("x");
    expect(res.body.data.items[0].patientName).toBe("John Doe");
    expect(res.body.data.hasNext).toBe(true);
    const listCall = http.calls[0].path;
    expect(listCall).toContain("_count=50");
    expect(listCall).not.toContain("page-offset");
    expect(listCall).toContain("status=entered");
  });

  it("maps list failures to user-facing errors", async () => {
    const { http, sdk } = createMockSdk();
    http.onError("GET", `${HF}/claims/`, 500, "Traceback (most recent call last)");
    const res = await handleClaimsList(sdk, params());
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ success: false, error: "Something went wrong on the server. Please try again shortly." });
  });

  it("validates create bodies and posts via claims.create with ENTERED/total 0", async () => {
    const { http, sdk } = createMockSdk();
    expect((await handleClaimCreate(sdk, INVALID_JSON_BODY)).body).toEqual({ success: false, error: "Invalid JSON body." });
    expect((await handleClaimCreate(sdk, "x")).body).toMatchObject({ error: "Invalid claim payload." });
    const missing = await handleClaimCreate(sdk, { patientChfId: "C1" });
    expect(missing.status).toBe(400);
    expect(missing.body).toMatchObject({ error: "Patient, date from, and primary diagnosis are required." });

    http.on("POST", `${HF}/claims/`, sampleClaimFhir());
    const ok = await handleClaimCreate(sdk, {
      patientChfId: "CHF123456",
      dateFrom: "2024-01-01",
      diagnoses: [{ code: "A00" }],
      total: 99,
    });
    expect(ok.status).toBe(201);
    const posted = http.lastCall?.body as { status?: string; total?: { value?: number } };
    expect(posted.status).toBe("ENTERED");
    expect(posted.total?.value ?? 0).toBe(0);
  });

  it("forces encounter visit type C on create", async () => {
    const { http, sdk } = createMockSdk();
    http.on("POST", `${HF}/encounters/`, sampleClaimFhir());
    const res = await handleEncounterCreate(sdk, {
      patientChfId: "C1",
      dateFrom: "2024-01-01",
      diagnoses: [{ code: "A00" }],
      visitType: "O",
    });
    expect(res.status).toBe(201);
    expect((http.lastCall?.body as { type: { coding: { code: string }[] } }).type.coding[0].code).toBe("C");
  });

  it("gets with a 404 message and requires an id", async () => {
    const { http, sdk } = createMockSdk();
    expect((await handleClaimGet(sdk, " ")).body).toEqual({ success: false, error: "Claim id is required." });
    http.onError("GET", `${HF}/claims/${UUID}/`, 404, "gone");
    const res = await handleClaimGet(sdk, UUID);
    expect(res).toEqual({ status: 404, body: { success: false, error: "Claim not found." } });
  });

  it("refuses to edit non-editable claims and merges existing fields on update", async () => {
    const { http, sdk } = createMockSdk();
    http.on("GET", `${HF}/claims/${UUID}/`, sampleClaimFhir({ status: "checked" }));
    const locked = await handleClaimUpdate(sdk, UUID, { explanation: "x" });
    expect(locked.status).toBe(400);
    expect(locked.body).toMatchObject({ error: "Only entered or rejected claims can be edited." });

    const { http: h2, sdk: s2 } = createMockSdk();
    h2.on("GET", `${HF}/claims/${UUID}/`, sampleClaimFhir());
    h2.on("PUT", `${HF}/claims/${UUID}/`, sampleClaimFhir({ status: "ENTERED" }));
    const ok = await handleClaimUpdate(s2, UUID, { explanation: "edited", dateFrom: "2024-03-01" });
    expect(ok.status).toBe(200);
    expect(h2.calls.map((c) => c.method)).toEqual(["GET", "PUT"]);
    const put = h2.lastCall?.body as { patient: { reference: string } };
    expect(JSON.stringify(put)).toContain("CHF123456");
  });

  it("returns 404 on update of an unknown encounter", async () => {
    const { http, sdk } = createMockSdk();
    http.onError("GET", `${HF}/encounters/${UUID}/`, 404, "x");
    expect((await handleEncounterUpdate(sdk, UUID, {})).body).toEqual({ success: false, error: "Encounter not found." });
  });

  it("submits full claims by id and reports the count", async () => {
    const { http, sdk } = createMockSdk();
    http.on("GET", `${HF}/claims/${UUID}/`, sampleClaimFhir());
    http.on("POST", `${HF}/claims/$submit/`, { message: "queued", data: {} });
    expect((await handleClaimsSubmit(sdk, {})).body).toEqual({ success: false, error: "Provide a non-empty ids array." });
    const res = await handleClaimsSubmit(sdk, { ids: [UUID, UUID] });
    expect(res.body).toEqual({ success: true, data: { message: "queued", count: 1 } });
  });

  it("stops submit when a claim cannot be loaded", async () => {
    const { http, sdk } = createMockSdk();
    http.onError("GET", `${HF}/encounters/x/`, 404, "no");
    const res = await handleEncountersSubmit(sdk, { ids: ["x"] });
    expect(res).toEqual({ status: 404, body: { success: false, error: "Could not load claim x for submit." } });
  });

  it("lists encounters through the encounter filters", async () => {
    const { http, sdk } = createMockSdk();
    http.on("GET", `${HF}/encounters/`, searchBundle("Claim", [sampleClaimFhir()]));
    http.on("GET", `${HF}/search-patient/`, samplePatientFhir());
    const res = await handleEncountersList(sdk, params({ dateTo: "2024-02-01", patientChfid: "C1" }));
    expect(res.status).toBe(200);
    expect(http.calls[0].path).toContain("patientChfid=C1");
  });
});

describe("preauthorization handlers", () => {
  it("lists by identifier as a one-item page, 404 message included", async () => {
    const { http, sdk } = createMockSdk();
    http.on("GET", `${HF}/preauthorizations/P1/`, samplePreauthFhir());
    const res = await handlePreauthorizationsList(sdk, params({ identifier: "P1" }));
    if (!res.body.success) throw new Error("x");
    expect(res.body.data).toMatchObject({ total: 1, hasNext: false });
    http.onError("GET", `${HF}/preauthorizations/P2/`, 404, "n");
    expect((await handlePreauthorizationsList(sdk, params({ identifier: "P2" }))).body).toEqual({
      success: false,
      error: "Pre-authorization not found.",
    });
  });

  it("lists with default ordering and filters", async () => {
    const { http, sdk } = createMockSdk();
    http.on("GET", `${HF}/preauthorizations/`, searchBundle("Claim", [samplePreauthFhir()]));
    const res = await handlePreauthorizationsList(sdk, params({ patientCHFID: "C1", status: "approved" }));
    expect(res.status).toBe(200);
    const path = http.calls[0].path;
    expect(path).toContain("order_by=-validity_from");
    expect(path).toContain("status=approved");
  });

  it("creates (201), updates and validates bodies", async () => {
    const { http, sdk } = createMockSdk();
    expect((await handlePreauthorizationCreate(sdk, INVALID_JSON_BODY)).status).toBe(400);
    expect((await handlePreauthorizationCreate(sdk, null)).body).toMatchObject({ error: "Invalid preauthorization payload." });
    http.on("POST", `${HF}/preauthorizations/`, samplePreauthFhir());
    const created = await handlePreauthorizationCreate(sdk, {
      patientChfId: "C1",
      hfToId: "9",
      primaryDiagnosisCode: "A00",
      serviceCode: "S1",
    });
    expect(created.status).toBe(201);
    http.on("PUT", `${HF}/preauthorizations/P1/`, samplePreauthFhir());
    const invalid = await handlePreauthorizationUpdate(sdk, "P1", { explanation: "e" });
    expect(invalid.status).toBe(400);
    expect(invalid.body).toMatchObject({ success: false });
    const updated = await handlePreauthorizationUpdate(sdk, "P1", {
      patientChfId: "C1",
      hfToId: "9",
      primaryDiagnosisCode: "A00",
      serviceCode: "S1",
    });
    expect(updated.status).toBe(200);
    expect(JSON.stringify(http.lastCall?.body)).toContain("P1");
    expect((await handlePreauthorizationGet(sdk, "")).body).toMatchObject({ error: "Pre-authorization id is required." });
  });

  it("returns per-row validation errors for bulk create without calling the backend", async () => {
    const { http, sdk } = createMockSdk();
    expect((await handlePreauthorizationsBulk(sdk, { items: [] })).body).toMatchObject({ error: "Provide a non-empty items array." });
    expect((await handlePreauthorizationsBulk(sdk, [1])).body).toMatchObject({ error: "Each item must be a preauthorization object." });
    const res = await handlePreauthorizationsBulk(sdk, [{ patientChfId: "C1" }]);
    expect(res.status).toBe(200);
    if (!res.body.success) throw new Error("x");
    expect(res.body.data.created).toEqual([]);
    expect(res.body.data.errors).toHaveLength(1);
    expect(http.calls).toHaveLength(0);
  });
});

describe("catalog handlers", () => {
  it("filters diagnoses and recomputes paging", async () => {
    const { http, sdk } = createMockSdk();
    http.on("GET", `${HF}/diagnoses/`, searchBundle("CodeSystem", []));
    const res = await handleCatalogDiagnoses(sdk, params({ q: "chol" }));
    expect(res.status).toBe(200);
  });

  it("requires a facility name", async () => {
    const { sdk } = createMockSdk();
    expect(await handleCatalogFacilities(sdk, params())).toEqual({
      status: 400,
      body: { success: false, error: "Provide hf_name (or q) to search facilities." },
    });
  });

  it("maps service/item search failures with the backend status", async () => {
    const { http, sdk } = createMockSdk();
    http.onError("GET", `${HF}/services/`, 403, "denied");
    http.onError("GET", `${HF}/medications/`, 404, "missing");
    expect(await handleCatalogServices(sdk, params({ q: "x" }))).toEqual({
      status: 403,
      body: { success: false, error: "You do not have permission to perform this action." },
    });
    expect((await handleCatalogItems(sdk, params())).status).toBe(404);
  });
});

describe("patients, config and session", () => {
  it("searches a patient by identifier", async () => {
    const { http, sdk } = createMockSdk();
    expect((await handlePatientSearch(sdk, params(), { apiBaseUrl: "http://h/api" })).body).toEqual({
      success: false,
      error: "Patient identifier is required.",
    });
    http.on("GET", `${HF}/search-patient/`, samplePatientFhir());
    const res = await handlePatientSearch(sdk, params({ identifier: " CHF123456 " }), { apiBaseUrl: "http://h/api" });
    if (!res.body.success) throw new Error("x");
    expect(res.body.data.chfId).toBe("CHF123456");
    http.onError("GET", `${HF}/search-patient/`, 404, "n");
    expect((await handlePatientSearch(sdk, params({ identifier: "z" }), { apiBaseUrl: "http://h/api" })).body).toEqual({
      success: false,
      error: "No patient found with that identifier.",
    });
  });

  it("falls back to default config on 5xx but reports 4xx", async () => {
    const { http, sdk } = createMockSdk();
    http.on("GET", `${HF}/client-config/`, { claimForm: { fixedPricesAtEnter: 1 }, money: { currencySymbol: "$", currencySymbolPosition: "RIGHT" } });
    const ok = await handleClientConfig(sdk);
    if (!ok.body.success) throw new Error("x");
    expect(ok.body.data.claimForm).toEqual({ fixedPricesAtEnter: true, fixedPricesAtReview: false });
    expect(ok.body.data.money).toMatchObject({ currencySymbol: "$", currencySymbolPosition: "right" });
    const { http: h2, sdk: s2 } = createMockSdk();
    h2.onError("GET", `${HF}/client-config/`, 403, "no");
    expect((await handleClientConfig(s2)).status).toBe(403);
  });

  it("returns session info without the token, defaults config on failure, and 401 without session", async () => {
    const { http, sdk } = createMockSdk();
    http.onError("GET", `${HF}/client-config/`, 500, "boom");
    expect((await handleSessionInfo(sdk, null)).status).toBe(401);
    const user = { id: "1", username: "u", email: "e", lastName: "", otherNames: "", language: "en", emailVerified: true, permissions: [], groups: [] };
    const res = await handleSessionInfo(sdk, { user, accessTokenExpires: 123 });
    if (!res.body.success) throw new Error("x");
    expect(res.body.data).toMatchObject({ expiresAt: 123, user });
    expect(res.body.data.clientConfig.money.currencyCode).toBe("NGN");
    expect(JSON.stringify(res.body)).not.toContain("accessToken");
  });
});

function createBulkSdk() {
  const mock = createMockSdk();
  Object.assign(mock.http, {
    postFormData: (path: string, body: unknown) => mock.http.post(path, body),
  });
  return mock;
}

describe("bulk upload handlers", () => {
  const csvRow = (extra = "") => `${BULK_CSV_HEADERS.join(",")}\n1,HF,2024-01-01,2024-01-01,2024-01-01,O,A00,,,,,S1,1,10${extra}\n`;

  it("validates JSON items and builds a CSV for the upload", async () => {
    const { http, sdk } = createBulkSdk();
    http.on("POST", `${HF}/bulk-encounters/`, {
      message: "done",
      total_rows: 1,
      successful: 1,
      failed: 0,
      results: [{ row: 1, success: true, message: "ok", claim_id: "c1" }],
    });
    const bad = await handleClaimsBulk(sdk, "HF", { type: "json", body: { items: [{ patientChfId: "1" }] } });
    expect(bad.body).toMatchObject({ error: "Each item must include patientChfId, dateFrom, and primaryDiagnosisCode." });
    const noCode = await handleClaimsBulk(sdk, "HF", { type: "json", body: { items: [{ patientChfId: "1", dateFrom: "d", primaryDiagnosisCode: "A" }] } });
    expect(noCode.body).toMatchObject({ error: "Each item needs a serviceCode and/or itemCode." });
    const noHf = await handleClaimsBulk(sdk, "", { type: "json", body: { items: [{ patientChfId: "1", dateFrom: "d", primaryDiagnosisCode: "A", serviceCode: "S" }] } });
    expect(noHf.body).toMatchObject({ error: "Health facility code is required." });
    expect((await handleClaimsBulk(sdk, "HF", { type: "json", body: INVALID_JSON_BODY })).body).toMatchObject({ error: "Invalid JSON body." });
    expect((await handleClaimsBulk(sdk, "HF", { type: "json", body: {} })).body).toMatchObject({ error: "Provide a non-empty items array or a CSV file." });

    const ok = await handleEncountersBulk(sdk, "HF", { type: "json", body: { items: [{ patientChfId: "1", dateFrom: "2024-01-01", primaryDiagnosisCode: "A", serviceCode: "S" }] } });
    expect(ok.status).toBe(200);
    if (!ok.body.success) throw new Error("x");
    expect(ok.body.data).toMatchObject({ totalRows: 1, successful: 1 });
    expect(http.calls).toHaveLength(1);
  });

  it("rewrites uploaded CSVs and reports row issues", async () => {
    const { http, sdk } = createBulkSdk();
    http.on("POST", `${HF}/bulk-encounters/`, { message: "m", total_rows: 1, successful: 1, failed: 0, results: [] });
    expect((await handleClaimsBulk(sdk, "HF", { type: "csv", text: null })).body).toMatchObject({ error: "CSV file is required (field name: file)." });
    const bad = await handleClaimsBulk(sdk, "HF", { type: "csv", text: "a,b\n1,2" });
    expect(bad.status).toBe(400);
    expect(bad.body).toMatchObject({ error: expect.stringContaining("Missing required columns") });
    const ok = await handleClaimsBulk(sdk, "HF", { type: "csv", text: csvRow() });
    expect(ok.status).toBe(200);
  });

  it("surfaces upstream failures", async () => {
    const { http, sdk } = createBulkSdk();
    http.onError("POST", `${HF}/bulk-encounters/`, 413, "Too large");
    const res = await handleClaimsBulk(sdk, "HF", { type: "csv", text: csvRow() });
    expect(res).toEqual({ status: 413, body: { success: false, error: "Too large" } });
  });

  it("reads multipart and JSON requests", async () => {
    const form = new FormData();
    form.append("file", new Blob(["a,b"], { type: "text/csv" }), "x.csv");
    expect(await readBulkUploadInput(new Request("http://x/", { method: "POST", body: form }))).toEqual({ type: "csv", text: "a,b" });
    const empty = new FormData();
    empty.append("other", "1");
    expect(await readBulkUploadInput(new Request("http://x/", { method: "POST", body: empty }))).toEqual({ type: "csv", text: null });
    const json = await readBulkUploadInput(new Request("http://x/", { method: "POST", body: "{bad", headers: { "content-type": "application/json" } }));
    expect(json).toEqual({ type: "json", body: INVALID_JSON_BODY });
    expect(sessionFacilityCode({ healthFacility: { code: " HF1 " } })).toBe("HF1");
    expect(sessionFacilityCode({})).toBe("");
  });
});
