/// <reference types="fhir" />

import HttpClient, { ApiResponse, mapData } from "../types";
import { MedicalServiceModel } from "../models/medical_service";
import { FhirSearchPage } from "../models/pagination";
import { parseSearchBundle } from "../fhir_converter/helpers";
import { medicalServiceFromChargeItemDefinition } from "../healthfacility/mappers";
import {
  FhirListParams,
  EMR_BASE_PATH,
  asFhirBundle,
  asFhirResource,
  buildQuery,
} from "./types";

class EmrServicesClient {
  constructor(private readonly httpClient: HttpClient) {}

  /**
   * Catalog list — requires Api-Key.
   * Backend returns ChargeItemDefinition resources.
   */
  async list(
    params: FhirListParams = new FhirListParams()
  ): Promise<ApiResponse<FhirSearchPage<MedicalServiceModel>>> {
    const response = await this.httpClient.get<unknown>(
      `${EMR_BASE_PATH}/services/${buildQuery(params.toQuery())}`
    );
    return mapData(response, (data) => {
      const page = parseSearchBundle(asFhirBundle(data), (resource) =>
        medicalServiceFromChargeItemDefinition(
          resource as fhir4.ChargeItemDefinition
        )
      );
      return new FhirSearchPage(
        page.total,
        page.items,
        page.selfUrl,
        page.nextUrl,
        page.previousUrl
      );
    });
  }

  async get(identifier: string): Promise<ApiResponse<MedicalServiceModel>> {
    const response = await this.httpClient.get<unknown>(
      `${EMR_BASE_PATH}/services/${encodeURIComponent(identifier)}/`
    );
    return mapData(response, (data) =>
      medicalServiceFromChargeItemDefinition(
        asFhirResource<fhir4.ChargeItemDefinition>(data)
      )
    );
  }
}

export default EmrServicesClient;
