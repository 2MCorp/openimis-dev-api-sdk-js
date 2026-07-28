/// <reference types="fhir" />

import HttpClient from "../types";
import HealthFacilityFhirConverter from "../fhir_converter/health_facility";
import { HealthFacilityModel } from "../models/health_facility";
import { FhirSearchPage } from "../models/pagination";
import {
  FhirListParams,
  HF_BASE_PATH,
  asFhirBundle,
  buildQuery,
} from "./types";

class HealthFacilityFacilitiesClient {
  private readonly converter = new HealthFacilityFhirConverter();

  constructor(private readonly httpClient: HttpClient) {}

  async searchByCode(
    hfCode: string,
    params: FhirListParams = new FhirListParams()
  ): Promise<FhirSearchPage<HealthFacilityModel>> {
    const data = await this.httpClient.get<unknown>(
      `${HF_BASE_PATH}/health-facilities/${buildQuery({
        ...params.toQuery(),
        hf_code: hfCode,
      })}`,
      { skipAuth: true }
    );
    return this.converter.fromSearchBundle(asFhirBundle(data));
  }

  async searchByName(
    hfName: string,
    params: FhirListParams = new FhirListParams()
  ): Promise<FhirSearchPage<HealthFacilityModel>> {
    const data = await this.httpClient.get<unknown>(
      `${HF_BASE_PATH}/health-facilities/${buildQuery({
        ...params.toQuery(),
        hf_name: hfName,
      })}`,
      { skipAuth: true }
    );
    return this.converter.fromSearchBundle(asFhirBundle(data));
  }
}

export default HealthFacilityFacilitiesClient;
