import HttpClient from "../types";
import { buildQuery } from "../healthfacility/types";
import {
  HealthFacilityAnalyticsResponse,
  PolicyHolderAnalyticsResponse,
  SystemAnalyticsResponse,
} from "./models";
import { DASHBOARD_BASE_PATH, DashboardQueryParams } from "./types";

class DashboardAnalyticsClient {
  constructor(private readonly httpClient: HttpClient) {}

  /**
   * GET /dashboard/analytics/policy-holder/
   * Auth: Knox Token or Policy Holder Api-Key (+ PolicyHolder-Code when multi-org).
   */
  async policyHolder(
    params: DashboardQueryParams = new DashboardQueryParams()
  ): Promise<PolicyHolderAnalyticsResponse> {
    const data = await this.httpClient.get<Record<string, unknown>>(
      `${DASHBOARD_BASE_PATH}/analytics/policy-holder/${buildQuery(params.toQuery())}`
    );
    return PolicyHolderAnalyticsResponse.fromJSON(data);
  }

  /**
   * GET /dashboard/analytics/health-facility/
   * Auth: Knox Token or Health Facility Api-Key.
   */
  async healthFacility(
    params: DashboardQueryParams = new DashboardQueryParams()
  ): Promise<HealthFacilityAnalyticsResponse> {
    const data = await this.httpClient.get<Record<string, unknown>>(
      `${DASHBOARD_BASE_PATH}/analytics/health-facility/${buildQuery(params.toQuery())}`
    );
    return HealthFacilityAnalyticsResponse.fromJSON(data);
  }

  /**
   * GET /dashboard/analytics/system/
   * Auth: System Api-Key only (`authScheme: "Api-Key"`).
   */
  async system(
    params: DashboardQueryParams = new DashboardQueryParams()
  ): Promise<SystemAnalyticsResponse> {
    const data = await this.httpClient.get<Record<string, unknown>>(
      `${DASHBOARD_BASE_PATH}/analytics/system/${buildQuery(params.toQuery())}`
    );
    return SystemAnalyticsResponse.fromJSON(data);
  }
}

export default DashboardAnalyticsClient;
