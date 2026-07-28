/// <reference types="fhir" />

import HttpClient, { ApiResponse, mapData } from "../types";
import PatientFhirConverter from "../fhir_converter/patient";
import { PatientModel } from "../models/patient";
import { FhirSearchPage } from "../models/pagination";
import { parseSearchBundle } from "../fhir_converter/helpers";
import {
  EMR_BASE_PATH,
  PatientReferenceListFilters,
  asFhirBundle,
  buildQuery,
} from "./types";

class EmrPatientReferencesClient {
  private readonly converter = new PatientFhirConverter();

  constructor(private readonly httpClient: HttpClient) {}

  async list(
    filters: PatientReferenceListFilters = new PatientReferenceListFilters()
  ): Promise<ApiResponse<FhirSearchPage<PatientModel>>> {
    const query = {
      ...filters.toQuery(),
      include: filters.include,
    };
    const response = await this.httpClient.get<unknown>(
      `${EMR_BASE_PATH}/patient-references/${buildQuery(query)}`
    );

    return mapData(response, (data) => {
      const page = parseSearchBundle(asFhirBundle(data), (resource) => {
        if (resource.resourceType === "Bundle") {
          const nested = resource as fhir4.Bundle;
          const first = nested.entry?.[0]?.resource as fhir4.Patient | undefined;
          if (!first) {
            return new PatientModel("", "", "", "");
          }
          return this.converter.fromFhir(first);
        }
        return this.converter.fromFhir(resource as fhir4.Patient);
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
}

export default EmrPatientReferencesClient;
