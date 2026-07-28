import HttpClient from "../types";
import DashboardMetricsClient from "./metrics";
import DashboardAnalyticsClient from "./analytics";

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
}

export default DashboardDevAPIClient;
export { DashboardMetricsClient, DashboardAnalyticsClient };
export * from "./types";
export * from "./models";
