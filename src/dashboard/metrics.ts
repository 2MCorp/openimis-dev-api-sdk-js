import HttpClient from "../types";
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
  ): Promise<PolicyHolderMetricResponse> {
    const data = await this.httpClient.get<Record<string, unknown>>(
      `${DASHBOARD_BASE_PATH}/metric/policy-holder/${buildQuery(params.toQuery())}`
    );
    return PolicyHolderMetricResponse.fromJSON(data);
  }

  /**
   * GET /dashboard/metric/health-facility/
   * Auth: Knox Token or Health Facility Api-Key.
   */
  async healthFacility(
    params: DashboardQueryParams = new DashboardQueryParams()
  ): Promise<HealthFacilityMetricResponse> {
    const data = await this.httpClient.get<Record<string, unknown>>(
      `${DASHBOARD_BASE_PATH}/metric/health-facility/${buildQuery(params.toQuery())}`
    );
    return HealthFacilityMetricResponse.fromJSON(data);
  }

  /**
   * GET /dashboard/metric/system/
   * Auth: System Api-Key only (`authScheme: "Api-Key"`).
   */
  async system(): Promise<SystemMetricResponse> {
    const data = await this.httpClient.get<Record<string, unknown>>(
      `${DASHBOARD_BASE_PATH}/metric/system/`
    );
    return SystemMetricResponse.fromJSON(data);
  }
}

export default DashboardMetricsClient;
