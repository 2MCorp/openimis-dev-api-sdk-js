import HttpClient, { ApiResponse, mapData } from "../types";
import { buildQuery } from "../healthfacility/types";
import {
  HealthFacilityMetricResponse,
  PolicyHolderMetricResponse,
  SystemMetricResponse,
} from "./models";
import { DASHBOARD_BASE_PATH, DashboardQueryParams } from "./types";

class DashboardMetricsClient {
  constructor(private readonly httpClient: HttpClient) {}

  /**
   * GET /dashboard/metric/policy-holder/
   * Auth: Knox Token or Policy Holder Api-Key (+ PolicyHolder-Code when multi-org).
   */
  async policyHolder(
    params: DashboardQueryParams = new DashboardQueryParams()
  ): Promise<ApiResponse<PolicyHolderMetricResponse>> {
    const response = await this.httpClient.get<Record<string, unknown>>(
      `${DASHBOARD_BASE_PATH}/metric/policy-holder/${buildQuery(params.toQuery())}`
    );
    return mapData(response, (data) =>
      PolicyHolderMetricResponse.fromJSON(data as Record<string, unknown>)
    );
  }

  /**
   * GET /dashboard/metric/health-facility/
   * Auth: Knox Token or Health Facility Api-Key.
   */
  async healthFacility(
    params: DashboardQueryParams = new DashboardQueryParams()
  ): Promise<ApiResponse<HealthFacilityMetricResponse>> {
    const response = await this.httpClient.get<Record<string, unknown>>(
      `${DASHBOARD_BASE_PATH}/metric/health-facility/${buildQuery(params.toQuery())}`
    );
    return mapData(response, (data) =>
      HealthFacilityMetricResponse.fromJSON(data as Record<string, unknown>)
    );
  }

  /**
   * GET /dashboard/metric/system/
   * Auth: System Api-Key only (`authScheme: "Api-Key"`).
   */
  async system(): Promise<ApiResponse<SystemMetricResponse>> {
    const response = await this.httpClient.get<Record<string, unknown>>(
      `${DASHBOARD_BASE_PATH}/metric/system/`
    );
    return mapData(response, (data) =>
      SystemMetricResponse.fromJSON(data as Record<string, unknown>)
    );
  }
}

export default DashboardMetricsClient;
