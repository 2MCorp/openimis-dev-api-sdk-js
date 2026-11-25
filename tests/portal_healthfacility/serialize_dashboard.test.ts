import { describe, expect, it } from "vitest";
import { ClaimDiagnosisModel, ClaimItemModel, ClaimModel } from "../../src/models/claim";
import { DiagnosisCode, PreauthorizationModel } from "../../src/models/preauthorization";
import { PatientModel } from "../../src/models/patient";
import { FhirSearchPage } from "../../src/models/pagination";
import {
  HealthFacilityAnalyticsResponse,
  HealthFacilityMetricResponse,
} from "../../src/dashboard/models";
import {
  emptyDashboardPayload,
  handleDashboard,
  parseDashboardQuery,
  serializeAnalytics,
  serializeClaim,
  serializeMetrics,
  serializePatient,
  serializePreauth,
  serializeSearchPage,
} from "../../src/portal/healthfacility";
import {
  sampleHealthFacilityAnalytics,
  sampleHealthFacilityMetric,
} from "../fixtures/samples";
import { createMockSdk, params } from "./helpers";

describe("serializers", () => {
  it("serializes a patient with data-URI photo, address and contacts", () => {
    const p = new PatientModel("1", "CHF1", "Doe", "John", "uuid-1");
    p.photoData = "AAAA";
    p.photoContentType = "image/png";
    p.city = "Abuja";
    p.contacts = [{ lastName: "Roe", otherNames: "Jane", phone: "1" }];
    const dto = serializePatient(p, "http://host/api");
    expect(dto.fullName).toBe("John Doe");
    expect(dto.photoUrl).toBe("data:image/png;base64,AAAA");
    expect(dto.address).toMatchObject({ city: "Abuja" });
    expect(dto.contacts?.[0].fullName).toBe("Jane Roe");
    expect(dto.isHead).toBe(false);
  });

  it("absolutizes relative photo urls and omits empty addresses", () => {
    const p = new PatientModel("1", "CHF1", "Doe", "John");
    p.photoUrl = "/media/p.jpg";
    const dto = serializePatient(p, "http://host/api");
    expect(dto.photoUrl).toBe("http://host/media/p.jpg");
    expect(dto.address).toBeNull();
  });

  it("prefers the uuid as claim id and falls back to a uuid-looking id", () => {
    const uuid = "22222222-2222-4222-8222-222222222222";
    const a = serializeClaim(new ClaimModel("77", "CLM-1", "ENTERED", "CHF1", undefined, uuid));
    expect(a.id).toBe(uuid);
    const b = serializeClaim(new ClaimModel(uuid, "CLM-1", 2, "CHF1"));
    expect(b.uuid).toBe(uuid);
    expect(b.status).toBe("2");
    const c = serializeClaim(new ClaimModel("77", "CLM-1", "ENTERED", "CHF1"));
    expect(c.id).toBe("77");
    expect(c.uuid).toBeUndefined();
  });

  it("serializes claim lines and diagnoses", () => {
    const claim = new ClaimModel("1", "C", "ENTERED", "CHF1", undefined, "u", undefined, undefined, "O");
    claim.diagnoses = [new ClaimDiagnosisModel(1, "A00", "Cholera")];
    claim.items = [new ClaimItemModel(1, "S1", "service", 2, 10, "₦")];
    const dto = serializeClaim(claim);
    expect(dto.diagnoses).toEqual([{ sequence: 1, code: "A00", display: "Cholera" }]);
    expect(dto.items?.[0]).toMatchObject({ code: "S1", quantity: 2, unitPrice: 10 });
    expect(dto.visitType).toBe("O");
  });

  it("serializes preauthorizations with fallback names", () => {
    const p = new PreauthorizationModel("1", "Entered", "CHF1");
    p.service = new DiagnosisCode("SVC1");
    p.primaryDiagnosis = new DiagnosisCode("A00", "Cholera");
    p.item = new DiagnosisCode("MED1", "Aspirin");
    const dto = serializePreauth(p);
    expect(dto.serviceName).toBe("SVC1");
    expect(dto.itemName).toBe("Aspirin");
    expect(dto.primaryDiagnosis).toEqual({ code: "A00", name: "Cholera" });
  });

  it("maps search pages", () => {
    const page = new FhirSearchPage(3, [1, 2], "self", "next");
    expect(serializeSearchPage(page, (n) => n * 2)).toEqual({
      total: 3,
      items: [2, 4],
      hasNext: true,
      hasPrevious: false,
    });
  });
});

describe("dashboard mapping", () => {
  it("maps metrics with defaults for missing numbers", () => {
    const metrics = HealthFacilityMetricResponse.fromJSON({
      ...sampleHealthFacilityMetric(),
      claims: { total: 20, entered: 5, bogus: "x" },
      time_series: {
        granularity: "month",
        claims_by_month: [{ period: "2024-01", total: 4, approved_count: 1 }, { nope: true }],
        encounters_by_month: [],
        combined_by_month: [{ period: "2024-01", total: 4 }],
      },
      recent: {
        claims: [{ id: 1, code: "C1", status: "entered", date_claimed: "2024-01-01", claimed: 10 }, {}],
        preauthorizations: [{ id: "p1", status: "A", service_name: "S" }],
      },
    });
    const view = serializeMetrics(metrics);
    expect(view.claims).toMatchObject({ total: 20, entered: 5, rejected: 0, approved: 0 });
    expect(view.timeSeries.claims).toHaveLength(1);
    expect(view.timeSeries.claims[0]).toMatchObject({ period: "2024-01", total: 4, approved_count: 1 });
    expect(view.timeSeries.combined).toHaveLength(1);
    expect(view.recent.claims).toEqual([
      {
        id: 1,
        uuid: undefined,
        code: "C1",
        status: "entered",
        date: "2024-01-01",
        patient_name: null,
        patient_chf_id: null,
        claimed: 10,
      },
    ]);
    expect(view.recent.preauthorizations[0]).toMatchObject({ id: "p1", service_name: "S", date: null });
    expect(view.openQueues.claims_entered).toBe(5);
    expect(view.filterApplied.months).toBe(6);
  });

  it("treats a legacy flat time series array as claims + combined", () => {
    const metrics = HealthFacilityMetricResponse.fromJSON({
      ...sampleHealthFacilityMetric(),
      time_series: [{ period: "2024-01", total: 2 }],
    });
    // fixture raw has an array time_series → SDK exposes it, serializer reads raw first
    const view = serializeMetrics(metrics);
    expect(view.timeSeries.claims[0].total).toBe(2);
    expect(view.timeSeries.encounters).toEqual([]);
  });

  it("maps analytics, referrals and seasonality", () => {
    const analytics = HealthFacilityAnalyticsResponse.fromJSON({
      ...sampleHealthFacilityAnalytics(),
      series: [{ period: "2024-01", value: 3, rejection_rate: 0.1 }, { value: 1 }],
      amount_leakage: { total_claimed: 100, total_approved: 80, leakage_amount: 20 },
      referrals: {
        total: 4,
        destinations: [{ health_facility_id: 2, health_facility_name: "HF", total: 4, approval_rate: 0.5 }],
      },
      seasonality: { by_day_of_week: { Mon: 3, Tue: "x" }, by_hour: { "9": 4, bad: 1 } },
    });
    const view = serializeAnalytics(analytics);
    expect(view.series).toHaveLength(1);
    expect(view.series[0]).toMatchObject({ period: "2024-01", value: 3, rejection_rate: 0.1, rejected: 0 });
    expect(view.amountLeakage).toMatchObject({ total_claimed: 100, leakage_amount: 20, approval_ratio: 0 });
    expect(view.referrals.destinations[0]).toMatchObject({ health_facility_id: 2, total: 4 });
    expect(view.seasonality).toEqual({ by_day_of_week: { Mon: 3 }, by_hour: { 9: 4 } });
    expect(view.insights[0].code).toBe("volume_up");
    expect(view.rates).toEqual({ approval_rate: 0.8 });
  });

  it("parses the dashboard query with clamping", () => {
    expect(parseDashboardQuery(params())).toEqual({ months: 6, granularity: "month" });
    expect(parseDashboardQuery(params({ months: "99", granularity: "week" }))).toEqual({
      months: 24,
      granularity: "week",
    });
    expect(parseDashboardQuery(params({ months: "-3", granularity: "year" }))).toEqual({
      months: 6,
      granularity: "month",
    });
    expect(emptyDashboardPayload({ months: 6, granularity: "day" }).metrics).toBeNull();
  });

  it("loads both halves independently and returns user-facing errors", async () => {
    const { http, sdk } = createMockSdk();
    http.on("GET", "/dashboard/metric/health-facility/", sampleHealthFacilityMetric());
    http.onError("GET", "/dashboard/analytics/health-facility/", 403, "nope");
    const res = await handleDashboard(sdk, params({ months: "3" }));
    expect(res.status).toBe(200);
    if (!res.body.success) throw new Error("expected success");
    expect(res.body.data.metrics).not.toBeNull();
    expect(res.body.data.analytics).toBeNull();
    expect(res.body.data.analyticsError).toBe("You do not have permission to perform this action.");
    expect(res.body.data.query).toEqual({ months: 3, granularity: "month" });
    expect(http.calls[0].path).toContain("months=3");
    expect(http.calls[0].path).toContain("recent_limit=5");
  });
});
