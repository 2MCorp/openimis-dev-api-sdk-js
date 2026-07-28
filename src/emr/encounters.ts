/// <reference types="fhir" />

import HttpClient from "../types";
import ClaimFhirConverter from "../fhir_converter/claims";
import { ClaimModel } from "../models/claim";
import { FhirSearchPage } from "../models/pagination";
import {
  EncounterListFilters,
  EMR_BASE_PATH,
  SubmitOperationResponse,
  asFhirBundle,
  asFhirResource,
  buildQuery,
} from "./types";

/**
 * Encounters are Claims with visit_type=C on the backend.
 * Responses are FHIR Claim resources.
 */
class EmrEncountersClient {
  private readonly converter = new ClaimFhirConverter();

  constructor(private readonly httpClient: HttpClient) {}

  async list(
    filters: EncounterListFilters = new EncounterListFilters()
  ): Promise<FhirSearchPage<ClaimModel>> {
    const data = await this.httpClient.get<unknown>(
      `${EMR_BASE_PATH}/encounters/${buildQuery(filters.toQuery())}`
    );
    return this.converter.fromSearchBundle(asFhirBundle(data));
  }

  async get(identifier: string): Promise<ClaimModel> {
    const data = await this.httpClient.get<unknown>(
      `${EMR_BASE_PATH}/encounters/${encodeURIComponent(identifier)}/`
    );
    return this.converter.fromFhir(asFhirResource<fhir4.Claim>(data));
  }

  async create(encounter: ClaimModel): Promise<ClaimModel> {
    const payload = this.converter.toFhir(encounter);
    payload.type = { coding: [{ code: "C", display: "Encounter" }] };
    const data = await this.httpClient.post<unknown>(
      `${EMR_BASE_PATH}/encounters/`,
      payload
    );
    return this.converter.fromFhir(asFhirResource<fhir4.Claim>(data));
  }

  async update(
    identifier: string,
    encounter: ClaimModel
  ): Promise<ClaimModel> {
    const data = await this.httpClient.put<unknown>(
      `${EMR_BASE_PATH}/encounters/${encodeURIComponent(identifier)}/`,
      this.converter.toFhir(encounter)
    );
    return this.converter.fromFhir(asFhirResource<fhir4.Claim>(data));
  }

  async patch(
    identifier: string,
    encounter: ClaimModel
  ): Promise<ClaimModel> {
    const data = await this.httpClient.patch<unknown>(
      `${EMR_BASE_PATH}/encounters/${encodeURIComponent(identifier)}/`,
      this.converter.toFhir(encounter)
    );
    return this.converter.fromFhir(asFhirResource<fhir4.Claim>(data));
  }

  /** POST encounters/$bulk-submit/ */
  async bulkSubmit(encounters: ClaimModel[]): Promise<SubmitOperationResponse> {
    const bundle = this.converter.toCollectionBundle(encounters);
    const data = await this.httpClient.post<Record<string, unknown>>(
      `${EMR_BASE_PATH}/encounters/$bulk-submit/`,
      bundle
    );
    return SubmitOperationResponse.fromJSON(data);
  }
}

export default EmrEncountersClient;
