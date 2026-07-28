import HttpClient, { ApiResponse, mapData } from "../types";
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
  ): Promise<ApiResponse<PolicyHolderAnalyticsResponse>> {
    const response = await this.httpClient.get<Record<string, unknown>>(
      `${DASHBOARD_BASE_PATH}/analytics/policy-holder/${buildQuery(params.toQuery())}`
    );
    return mapData(response, (data) =>
      PolicyHolderAnalyticsResponse.fromJSON(data as Record<string, unknown>)
    );
  }

  /**
   * GET /dashboard/analytics/health-facility/
   * Auth: Knox Token or Health Facility Api-Key.
   */
  async healthFacility(
    params: DashboardQueryParams = new DashboardQueryParams()
  ): Promise<ApiResponse<HealthFacilityAnalyticsResponse>> {
    const response = await this.httpClient.get<Record<string, unknown>>(
      `${DASHBOARD_BASE_PATH}/analytics/health-facility/${buildQuery(params.toQuery())}`
    );
    return mapData(response, (data) =>
      HealthFacilityAnalyticsResponse.fromJSON(data as Record<string, unknown>)
    );
  }

  /**
   * GET /dashboard/analytics/system/
   * Auth: System Api-Key only (`authScheme: "Api-Key"`).
   */
  async system(
    params: DashboardQueryParams = new DashboardQueryParams()
  ): Promise<ApiResponse<SystemAnalyticsResponse>> {
    const response = await this.httpClient.get<Record<string, unknown>>(
      `${DASHBOARD_BASE_PATH}/analytics/system/${buildQuery(params.toQuery())}`
    );
    return mapData(response, (data) =>
      SystemAnalyticsResponse.fromJSON(data as Record<string, unknown>)
    );
  }
}

export default DashboardAnalyticsClient;
