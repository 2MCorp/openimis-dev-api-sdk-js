/// <reference types="fhir" />

import HttpClient, { ApiResponse, mapData } from "../types";
import MedicationFhirConverter from "../fhir_converter/medication";
import { MedicationItemModel } from "../models/medication";
import { FhirSearchPage } from "../models/pagination";
import {
  FhirListParams,
  EMR_BASE_PATH,
  asFhirBundle,
  asFhirResource,
  buildQuery,
} from "./types";

class EmrMedicationsClient {
  private readonly converter = new MedicationFhirConverter();

  constructor(private readonly httpClient: HttpClient) {}

  /** Catalog list — requires Api-Key (unlike HF public catalog). */
  async list(
    params: FhirListParams = new FhirListParams()
  ): Promise<ApiResponse<FhirSearchPage<MedicationItemModel>>> {
    const response = await this.httpClient.get<unknown>(
      `${EMR_BASE_PATH}/medications/${buildQuery(params.toQuery())}`
    );
    return mapData(response, (data) =>
      this.converter.fromSearchBundle(asFhirBundle(data))
    );
  }

  async get(identifier: string): Promise<ApiResponse<MedicationItemModel>> {
    const response = await this.httpClient.get<unknown>(
      `${EMR_BASE_PATH}/medications/${encodeURIComponent(identifier)}/`
    );
    return mapData(response, (data) =>
      this.converter.fromFhir(asFhirResource<fhir4.Medication>(data))
    );
  }
}

export default EmrMedicationsClient;
