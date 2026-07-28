/// <reference types="fhir" />

import HttpClient, { ApiResponse, mapData } from "../types";
import DiagnosisFhirConverter from "../fhir_converter/diagnosis";
import { DiagnosisModel } from "../models/diagnosis";
import { FhirSearchPage } from "../models/pagination";
import { parseSearchBundle } from "../fhir_converter/helpers";
import {
  FhirListParams,
  EMR_BASE_PATH,
  asFhirBundle,
  asFhirResource,
  buildQuery,
} from "./types";

class EmrDiagnosesClient {
  private readonly converter = new DiagnosisFhirConverter();

  constructor(private readonly httpClient: HttpClient) {}

  async list(
    params: FhirListParams = new FhirListParams()
  ): Promise<ApiResponse<FhirSearchPage<DiagnosisModel>>> {
    const response = await this.httpClient.get<unknown>(
      `${EMR_BASE_PATH}/diagnoses/${buildQuery(params.toQuery())}`
    );
    return mapData(response, (data) => {
      const page = parseSearchBundle(asFhirBundle(data), (resource) => {
        const diagnoses = this.converter.fromFhir(resource as fhir4.CodeSystem);
        return diagnoses[0] ?? new DiagnosisModel("", "");
      });
      return new FhirSearchPage(
        page.total,
        page.items,
        page.selfUrl,
        page.nextUrl,
        page.previousUrl
      );
    });
  }

  async get(pk: string): Promise<ApiResponse<DiagnosisModel[]>> {
    const response = await this.httpClient.get<unknown>(
      `${EMR_BASE_PATH}/diagnoses/${encodeURIComponent(pk)}/`
    );
    return mapData(response, (data) =>
      this.converter.fromFhir(asFhirResource<fhir4.CodeSystem>(data))
    );
  }
}

export default EmrDiagnosesClient;
