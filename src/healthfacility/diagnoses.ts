/// <reference types="fhir" />

import HttpClient from "../types";
import DiagnosisFhirConverter from "../fhir_converter/diagnosis";
import { DiagnosisModel } from "../models/diagnosis";
import { FhirSearchPage } from "../models/pagination";
import { parseSearchBundle } from "../fhir_converter/helpers";
import {
  FhirListParams,
  HF_BASE_PATH,
  asFhirBundle,
  asFhirResource,
  buildQuery,
} from "./types";

class HealthFacilityDiagnosesClient {
  private readonly converter = new DiagnosisFhirConverter();

  constructor(private readonly httpClient: HttpClient) {}

  async list(
    params: FhirListParams = new FhirListParams()
  ): Promise<FhirSearchPage<DiagnosisModel>> {
    const data = await this.httpClient.get<unknown>(
      `${HF_BASE_PATH}/diagnoses/${buildQuery(params.toQuery())}`,
      { skipAuth: true }
    );
    const page = parseSearchBundle(asFhirBundle(data), (resource) => {
      const diagnoses = this.converter.fromFhir(
        resource as fhir4.CodeSystem
      );
      return diagnoses[0] ?? new DiagnosisModel("", "");
    });
    return new FhirSearchPage(
      page.total,
      page.items,
      page.selfUrl,
      page.nextUrl,
      page.previousUrl
    );
  }

  async get(pk: string): Promise<DiagnosisModel[]> {
    const data = await this.httpClient.get<unknown>(
      `${HF_BASE_PATH}/diagnoses/${encodeURIComponent(pk)}/`,
      { skipAuth: true }
    );
    return this.converter.fromFhir(
      asFhirResource<fhir4.CodeSystem>(data)
    );
  }
}

export default HealthFacilityDiagnosesClient;
