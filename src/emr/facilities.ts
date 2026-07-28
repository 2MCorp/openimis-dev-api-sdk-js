/// <reference types="fhir" />

import HttpClient, { ApiResponse, mapData } from "../types";
import HealthFacilityFhirConverter from "../fhir_converter/health_facility";
import { HealthFacilityModel } from "../models/health_facility";
import { FhirSearchPage } from "../models/pagination";
import {
  FhirListParams,
  EMR_BASE_PATH,
  asFhirBundle,
  buildQuery,
} from "./types";

class EmrFacilitiesClient {
  private readonly converter = new HealthFacilityFhirConverter();

  constructor(private readonly httpClient: HttpClient) {}

  async searchByCode(
    hfCode: string,
    params: FhirListParams = new FhirListParams()
  ): Promise<ApiResponse<FhirSearchPage<HealthFacilityModel>>> {
    const response = await this.httpClient.get<unknown>(
      `${EMR_BASE_PATH}/health-facilities/${buildQuery({
        ...params.toQuery(),
        hf_code: hfCode,
      })}`
    );
    return mapData(response, (data) =>
      this.converter.fromSearchBundle(asFhirBundle(data))
    );
  }

  async searchByName(
    hfName: string,
    params: FhirListParams = new FhirListParams()
  ): Promise<ApiResponse<FhirSearchPage<HealthFacilityModel>>> {
    const response = await this.httpClient.get<unknown>(
      `${EMR_BASE_PATH}/health-facilities/${buildQuery({
        ...params.toQuery(),
        hf_name: hfName,
      })}`
    );
    return mapData(response, (data) =>
      this.converter.fromSearchBundle(asFhirBundle(data))
    );
  }
}

export default EmrFacilitiesClient;
