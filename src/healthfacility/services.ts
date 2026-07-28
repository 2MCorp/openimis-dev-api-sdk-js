/// <reference types="fhir" />

import HttpClient from "../types";
import { MedicalServiceModel } from "../models/medical_service";
import { FhirSearchPage } from "../models/pagination";
import { parseSearchBundle } from "../fhir_converter/helpers";
import { medicalServiceFromChargeItemDefinition } from "./mappers";
import {
  FhirListParams,
  HF_BASE_PATH,
  asFhirBundle,
  buildQuery,
} from "./types";

class HealthFacilityServicesClient {
  constructor(private readonly httpClient: HttpClient) {}

  /**
   * Public catalog list.
   * Backend returns ChargeItemDefinition resources.
   */
  async list(
    params: FhirListParams = new FhirListParams()
  ): Promise<FhirSearchPage<MedicalServiceModel>> {
    const data = await this.httpClient.get<unknown>(
      `${HF_BASE_PATH}/services/${buildQuery(params.toQuery())}`,
      { skipAuth: true }
    );
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
  }
}

export default HealthFacilityServicesClient;
