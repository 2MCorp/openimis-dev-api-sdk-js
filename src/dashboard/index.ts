import HttpClient from "../types";
import DashboardMetricsClient from "./metrics";
import DashboardAnalyticsClient from "./analytics";
import { ApiResponse } from "../api_response";
import {
  PolicyHolderAnalyticsSummary,
  PolicyHolderMetricsSummary,
  policyHolderDashboardParams,
  summarizePolicyHolderAnalytics,
  summarizePolicyHolderMetrics,
} from "./policy_holder_views";

export type PolicyHolderOverview = {
  metrics: ApiResponse<PolicyHolderMetricsSummary>;
  analytics: ApiResponse<PolicyHolderAnalyticsSummary>;
};

/**
 * Client for `/dashboard/` plugin endpoints (metrics + analytics).
 * Responses are plain JSON KPI payloads (not FHIR).
 */
class DashboardDevAPIClient {
  public readonly metrics: DashboardMetricsClient;
  public readonly analytics: DashboardAnalyticsClient;

  constructor(httpClient: HttpClient) {
    this.metrics = new DashboardMetricsClient(httpClient);
    this.analytics = new DashboardAnalyticsClient(httpClient);
  }

  /**
   * Employer dashboard: metrics + analytics in parallel, as typed summaries.
   * The two calls fail independently (e.g. analytics can error while metrics load).
   */
  async policyHolderOverview(query: {
    months?: unknown;
    granularity?: unknown;
  } = {}): Promise<PolicyHolderOverview> {
    const params = policyHolderDashboardParams(query);
    const [metrics, analytics] = await Promise.all([
      this.metrics.policyHolder(params),
      this.analytics.policyHolder(params),
    ]);
    return {
      metrics:
        metrics.success && metrics.data
          ? ApiResponse.ok(summarizePolicyHolderMetrics(metrics.data), metrics.statusCode)
          : metrics.asFailure<PolicyHolderMetricsSummary>(),
      analytics:
        analytics.success && analytics.data
          ? ApiResponse.ok(summarizePolicyHolderAnalytics(analytics.data), analytics.statusCode)
          : analytics.asFailure<PolicyHolderAnalyticsSummary>(),
    };
  }
}

export default DashboardDevAPIClient;
export { DashboardMetricsClient, DashboardAnalyticsClient };
export * from "./types";
export * from "./models";
export * from "./policy_holder_views";
