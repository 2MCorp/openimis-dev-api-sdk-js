import { describe, expect, it } from "vitest";
import DashboardDevAPIClient from "../src/dashboard/index";
import { DashboardQueryParams } from "../src/dashboard/types";
import { MockHttpClient } from "./helpers/mockHttpClient";
import {
  sampleHealthFacilityAnalytics,
  sampleHealthFacilityMetric,
  samplePolicyHolderAnalytics,
  samplePolicyHolderMetric,
  sampleSystemAnalytics,
  sampleSystemMetric,
} from "./fixtures/samples";

function createClient(http = new MockHttpClient()) {
  return {
    http,
    client: new DashboardDevAPIClient(http.asHttpClient()),
  };
}

describe("DashboardDevAPIClient", () => {
  describe("metrics", () => {
    it("loads policy-holder metrics with query params", async () => {
      const { http, client } = createClient();
      http.on(
        "GET",
        "/dashboard/metric/policy-holder/",
        samplePolicyHolderMetric()
      );

      const result = await client.metrics.policyHolder(
        new DashboardQueryParams(6, "month", "2024-01-01", "2024-06-30", 60)
      );

      expect(result.employees.total_active).toBe(10);
      expect(result.claimsSummary.approved).toBe(7);
      expect(result.filterApplied.months).toBe(6);
      expect(result.filterApplied.expiringDays).toBe(60);
      expect(result.raw.employees).toBeTruthy();
      expect(http.lastCall?.path).toContain("months=6");
      expect(http.lastCall?.path).toContain("granularity=month");
      expect(http.lastCall?.path).toContain("date_from=2024-01-01");
      expect(http.lastCall?.path).toContain("expiring_days=60");
    });

    it("loads health-facility metrics", async () => {
      const { http, client } = createClient();
      http.on(
        "GET",
        "/dashboard/metric/health-facility/",
        sampleHealthFacilityMetric()
      );

      const result = await client.metrics.healthFacility(
        new DashboardQueryParams(6, "week", undefined, undefined, undefined, 5)
      );

      expect(result.claims.total).toBe(20);
      expect(result.openQueues.claims_entered).toBe(5);
      expect(result.timeSeries).toHaveLength(1);
      expect(result.filterApplied.recentLimit).toBe(5);
      expect(http.lastCall?.path).toContain("granularity=week");
      expect(http.lastCall?.path).toContain("recent_limit=5");
    });

    it("loads system metrics without query string", async () => {
      const { http, client } = createClient();
      http.on("GET", "/dashboard/metric/system/", sampleSystemMetric());

      const result = await client.metrics.system();

      expect(result.apiKeys.system).toMatchObject({ total: 1, active: 1 });
      expect(result.insureeUsers.verified).toBe(4);
      expect(http.lastCall?.path).toBe("/dashboard/metric/system/");
    });
  });

  describe("analytics", () => {
    it("loads policy-holder analytics with insights", async () => {
      const { http, client } = createClient();
      http.on(
        "GET",
        "/dashboard/analytics/policy-holder/",
        samplePolicyHolderAnalytics()
      );

      const result = await client.analytics.policyHolder(
        new DashboardQueryParams(6)
      );

      expect(result.comparisons.current.employees).toBe(10);
      expect(result.comparisons.deltaPct.employees).toBe(25);
      expect(result.insights[0]?.code).toBe("payment_gap");
      expect(result.paymentGap.collection_rate).toBe(0.7);
      expect(http.lastCall?.path).toContain("/dashboard/analytics/policy-holder/");
    });

    it("loads health-facility analytics", async () => {
      const { http, client } = createClient();
      http.on(
        "GET",
        "/dashboard/analytics/health-facility/",
        sampleHealthFacilityAnalytics()
      );

      const result = await client.analytics.healthFacility(
        new DashboardQueryParams(
          6,
          "month",
          undefined,
          undefined,
          undefined,
          undefined,
          48
        )
      );

      expect(result.rates.approval_rate).toBe(0.8);
      expect(result.sla.within_sla_pct).toBe(0.9);
      expect(result.filterApplied.slaHours).toBe(48);
      expect(http.lastCall?.path).toContain("sla_hours=48");
    });

    it("loads system analytics", async () => {
      const { http, client } = createClient();
      http.on(
        "GET",
        "/dashboard/analytics/system/",
        sampleSystemAnalytics()
      );

      const result = await client.analytics.system(new DashboardQueryParams(3));

      expect(result.apiKeyLifecycle.created).toBe(2);
      expect(result.pluginHealth.enabled).toBe(7);
      expect(http.lastCall?.path).toContain("months=3");
    });
  });
});
