import { describe, expect, it } from "vitest";
import { ApiResponse } from "../../src/api_response";
import { FhirSearchPage } from "../../src/models/pagination";
import { ContractModel } from "../../src/models/contract";
import { EmployeeModel } from "../../src/models/employee";
import {
  authorizeEmployerRoute,
  handleContractCreate,
  handleContractGet,
  handleContractsList,
  handleInsureeSearch,
  handleMemberCreate,
  handleMemberFamily,
  handleMembersList,
  handleMembersUpload,
  handleMembersUploadFile,
  handlePay,
  handleDashboard,
  parseDashboardQuery,
  toSearchParams,
} from "../../src/portal/employer";
import { fakeSdk } from "./helpers";

const page = <T>(items: T[]) => new FhirSearchPage<T>(items.length, items);

describe("authorizeEmployerRoute", () => {
  const user = { permissions: ["api_auth.view_contracts"] };

  it("answers 401 without a user and 403 without the permission", () => {
    expect(authorizeEmployerRoute(null, "GET /api/contracts")).toMatchObject({ status: 401 });
    expect(authorizeEmployerRoute(user, "POST /api/contracts")).toMatchObject({
      status: 403,
      body: { success: false, error: "You do not have permission to perform this action." },
    });
    expect(authorizeEmployerRoute(user, "GET /api/contracts")).toBeNull();
  });

  it("hides payment-gateway routes unless online payments are on (404 before 401)", () => {
    expect(authorizeEmployerRoute(null, "GET /api/payment-gateway/methods")).toMatchObject({ status: 404 });
    expect(
      authorizeEmployerRoute({ permissions: ["view_payments"] }, "GET /api/payment-gateway/methods", {
        onlinePayments: true,
      })
    ).toBeNull();
  });

  it("maps report kinds to their view permission and rejects unknown ones", () => {
    expect(authorizeEmployerRoute({ permissions: ["view_plans"] }, "GET /api/reports/health-packages")).toBeNull();
    expect(authorizeEmployerRoute(user, "GET /api/reports/members")).toMatchObject({ status: 403 });
    expect(authorizeEmployerRoute(user, "GET /api/reports/nope")).toMatchObject({ status: 404 });
  });

  it("rejects unknown routes", () => {
    expect(authorizeEmployerRoute(user, "GET /api/other")).toMatchObject({ status: 404 });
  });
});

describe("list handlers", () => {
  it("clamps paging and forwards filters", async () => {
    let filters: any;
    const sdk = fakeSdk({
      formalSector: {
        employees: {
          list: async (f: unknown) => {
            filters = f;
            return ApiResponse.ok(page([new EmployeeModel("u1", "Doe", "Jane", "C1")]));
          },
        },
      },
    });
    const env = await handleMembersList(sdk, "page-offset=0&_count=999&chfId=%20C1%20");
    expect(env.status).toBe(200);
    expect(env.body).toMatchObject({ success: true, data: { total: 1, items: [{ id: "u1", fullName: "Jane Doe" }] } });
    expect(filters.pageOffset).toBeUndefined();
    expect(filters.count).toBe(50);
    expect(filters.chfId).toBe("C1");
  });

  it("builds the approved date range for contracts", async () => {
    let filters: any;
    const sdk = fakeSdk({
      formalSector: {
        contracts: {
          list: async (f: unknown) => {
            filters = f;
            return ApiResponse.ok(page<ContractModel>([]));
          },
        },
      },
    });
    await handleContractsList(sdk, { approvedFrom: "2026-01-01", approvedTo: "2026-02-01" });
    expect(JSON.stringify(filters)).toContain("2026-01-01||2026-02-01");
  });
});

describe("failures", () => {
  it("replaces a 404 message and sanitises others", async () => {
    const sdk = fakeSdk({
      formalSector: {
        contracts: {
          get: async (id: string) =>
            id === "x" ? ApiResponse.fail(404, "No Contract matches the given query.") : ApiResponse.fail(500, "Traceback (most recent call last)"),
        },
      },
    });
    expect(await handleContractGet(sdk, "x")).toEqual({
      status: 404,
      body: { success: false, error: "Contract not found." },
    });
    const boom = await handleContractGet(sdk, "y");
    expect(boom.status).toBe(500);
    expect(boom.body).toMatchObject({ success: false, error: "Something went wrong on the server. Please try again shortly." });
  });

  it("maps network failure (status 0) to 502", async () => {
    const sdk = fakeSdk({
      formalSector: { contracts: { get: async () => ApiResponse.fail(0, "fetch failed") } },
    });
    expect((await handleContractGet(sdk, "z")).status).toBe(502);
  });

  it("creates contracts with 201", async () => {
    const sdk = fakeSdk({
      formalSector: { contracts: { createDraft: async () => ApiResponse.ok(new ContractModel("c1", "C-1", "draft")) } },
    });
    const env = await handleContractCreate(sdk, { code: "C-1", dateValidFrom: "2026-01-01", dateValidTo: "2026-12-31" });
    expect(env.status).toBe(201);
    expect(env.body).toMatchObject({ success: true, data: { code: "C-1", editable: true } });
  });
});

describe("member handlers", () => {
  it("returns calculation field errors on a 400 enrol", async () => {
    const sdk = fakeSdk({
      formalSector: {
        enrollEmployee: async () =>
          ApiResponse.fail(400, "Bad request", [{ field: "calculation_rule.income", errors: ["Income is required"] }]),
      },
    });
    const env = await handleMemberCreate(sdk, { chfId: "C1", policyHolderContributionPlanId: "7" });
    expect(env.status).toBe(400);
    expect(env.body).toMatchObject({ success: false, error: "Income is required" });
    expect((env.body as { fieldErrors?: unknown }).fieldErrors).toBeTruthy();
  });

  it("treats a missing family as an empty answer but passes failures on", async () => {
    const none = fakeSdk({ formalSector: { groups: { getByEmployeeUuid: async () => ApiResponse.ok(null) } } });
    expect(await handleMemberFamily(none, "u1")).toEqual({ status: 200, body: { success: true, data: null } });
    const bad = fakeSdk({ formalSector: { groups: { getByEmployeeUuid: async () => ApiResponse.fail(403, "no") } } });
    expect((await handleMemberFamily(bad, "u1")).status).toBe(403);
  });

  it("requires an identifier for insuree search", async () => {
    const env = await handleInsureeSearch(fakeSdk({}), "identifier=%20", { apiBaseUrl: "http://h/api" });
    expect(env).toEqual({
      status: 400,
      body: { success: false, error: "An insuree identifier is required." },
    });
  });

  it("returns 201 with created count on upload and row errors on failure", async () => {
    const okSdk = fakeSdk({
      formalSector: {
        employees: { uploadFile: async () => ApiResponse.ok([new EmployeeModel("u1", "Doe", "Jane", "C1")]) },
      },
    });
    const env = await handleMembersUpload(okSdk, { fileName: "a.csv", base64: "QQ==" });
    expect(env).toMatchObject({ status: 201, body: { success: true, data: { created: 1 } } });

    const badSdk = fakeSdk({
      formalSector: {
        employees: {
          uploadFile: async () =>
            ApiResponse.fail(400, "Bad request", [{ row: 3, error: "Insuree not found" }]),
        },
      },
    });
    const bad = await handleMembersUpload(badSdk, { fileName: "a.csv", base64: "QQ==" });
    expect(bad.status).toBe(400);
    expect(bad.body).toMatchObject({ success: false, rowErrors: ["Row 3: Insuree not found"] });
  });

  it("base64-encodes a File for the multipart variant", async () => {
    let received: any;
    const sdk = fakeSdk({
      formalSector: {
        employees: {
          uploadFile: async (input: unknown) => {
            received = input;
            return ApiResponse.ok([]);
          },
        },
      },
    });
    await handleMembersUploadFile(sdk, new File(["hello"], "m.csv"), "PLAN");
    expect(received).toEqual({ fileName: "m.csv", base64: "aGVsbG8=", defaultPlanCode: "PLAN" });
  });
});

describe("payments and dashboard", () => {
  it("starts checkout with the portal return URL and never an amount", async () => {
    let sent: any;
    const sdk = fakeSdk({
      formalSector: {
        paymentGateway: {
          payContract: async (input: unknown) => {
            sent = input;
            return ApiResponse.ok({ transactionId: "t1", url: "https://pay" });
          },
        },
      },
    });
    const env = await handlePay(
      sdk,
      { contractId: "c1", providerCode: "p", paymentMethodCode: "card", amount: 5 },
      { origin: "https://portal.test/" }
    );
    expect(env.status).toBe(201);
    expect(sent).toEqual({
      contractId: "c1",
      providerCode: "p",
      paymentMethodCode: "card",
      idempotencyKey: undefined,
      returnUrl: "https://portal.test/payments/return",
    });
  });

  it("normalises the dashboard query and reports each half's failure", async () => {
    const q = parseDashboardQuery("months=999&granularity=bogus");
    expect(q.months).toBeLessThanOrEqual(24);
    expect(q.months).toBeGreaterThanOrEqual(2);
    const sdk = fakeSdk({
      dashboard: {
        policyHolderOverview: async () => ({
          metrics: ApiResponse.fail(403, "nope"),
          analytics: ApiResponse.fail(500, "boom"),
        }),
      },
    });
    const env = await handleDashboard(sdk, {});
    expect(env.status).toBe(200);
    expect(env.body).toMatchObject({
      success: true,
      data: {
        metrics: null,
        contractGroups: null,
        metricsError: "You do not have permission to perform this action.",
      },
    });
  });
});

describe("toSearchParams", () => {
  it("accepts strings, objects and URLSearchParams", () => {
    expect(toSearchParams("?a=1").get("a")).toBe("1");
    expect(toSearchParams({ a: 2, b: undefined }).get("a")).toBe("2");
    expect(toSearchParams({ a: 2, b: undefined }).has("b")).toBe(false);
    const p = new URLSearchParams("x=1");
    expect(toSearchParams(p)).toBe(p);
  });
});
