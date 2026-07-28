/// <reference types="fhir" />

import HttpClient, { ApiResponse, mapData } from "../types";
import MedicationFhirConverter from "../fhir_converter/medication";
import { MedicationItemModel } from "../models/medication";
import { FhirSearchPage } from "../models/pagination";
import {
  FhirListParams,
  HF_BASE_PATH,
  asFhirBundle,
  buildQuery,
} from "./types";

class HealthFacilityMedicationsClient {
  private readonly converter = new MedicationFhirConverter();

  constructor(private readonly httpClient: HttpClient) {}

  /** Public catalog list. */
  async list(
    params: FhirListParams = new FhirListParams()
  ): Promise<ApiResponse<FhirSearchPage<MedicationItemModel>>> {
    const response = await this.httpClient.get<unknown>(
      `${HF_BASE_PATH}/medications/${buildQuery(params.toQuery())}`,
      { skipAuth: true }
    );
    return mapData(response, (data) =>
      this.converter.fromSearchBundle(asFhirBundle(data))
    );
  }
}

export default HealthFacilityMedicationsClient;
