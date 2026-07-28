/// <reference types="fhir" />

import HttpClient, { ApiResponse, mapData } from "../types";
import ClaimFhirConverter from "../fhir_converter/claims";
import { ClaimModel } from "../models/claim";
import { FhirSearchPage } from "../models/pagination";
import {
  EncounterListFilters,
  HF_BASE_PATH,
  SubmitOperationResponse,
  asFhirBundle,
  asFhirResource,
  buildQuery,
} from "./types";

/**
 * Encounters are Claims with visit_type=C on the backend.
 * Responses are FHIR Claim resources.
 */
class HealthFacilityEncountersClient {
  private readonly converter = new ClaimFhirConverter();

  constructor(private readonly httpClient: HttpClient) {}

  async list(
    filters: EncounterListFilters = new EncounterListFilters()
  ): Promise<ApiResponse<FhirSearchPage<ClaimModel>>> {
    const response = await this.httpClient.get<unknown>(
      `${HF_BASE_PATH}/encounters/${buildQuery(filters.toQuery())}`
    );
    return mapData(response, (data) =>
      this.converter.fromSearchBundle(asFhirBundle(data))
    );
  }

  async get(identifier: string): Promise<ApiResponse<ClaimModel>> {
    const response = await this.httpClient.get<unknown>(
      `${HF_BASE_PATH}/encounters/${encodeURIComponent(identifier)}/`
    );
    return mapData(response, (data) =>
      this.converter.fromFhir(asFhirResource<fhir4.Claim>(data))
    );
  }

  async create(encounter: ClaimModel): Promise<ApiResponse<ClaimModel>> {
    const payload = this.converter.toFhir(encounter);
    payload.type = { coding: [{ code: "C", display: "Encounter" }] };
    const response = await this.httpClient.post<unknown>(
      `${HF_BASE_PATH}/encounters/`,
      payload
    );
    return mapData(response, (data) =>
      this.converter.fromFhir(asFhirResource<fhir4.Claim>(data))
    );
  }

  async update(
    identifier: string,
    encounter: ClaimModel
  ): Promise<ApiResponse<ClaimModel>> {
    const response = await this.httpClient.put<unknown>(
      `${HF_BASE_PATH}/encounters/${encodeURIComponent(identifier)}/`,
      this.converter.toFhir(encounter)
    );
    return mapData(response, (data) =>
      this.converter.fromFhir(asFhirResource<fhir4.Claim>(data))
    );
  }

  async patch(
    identifier: string,
    encounter: ClaimModel
  ): Promise<ApiResponse<ClaimModel>> {
    const response = await this.httpClient.patch<unknown>(
      `${HF_BASE_PATH}/encounters/${encodeURIComponent(identifier)}/`,
      this.converter.toFhir(encounter)
    );
    return mapData(response, (data) =>
      this.converter.fromFhir(asFhirResource<fhir4.Claim>(data))
    );
  }

  /** POST encounters/$bulk-submit/ */
  async bulkSubmit(encounters: ClaimModel[]): Promise<ApiResponse<SubmitOperationResponse>> {
    const bundle = this.converter.toCollectionBundle(encounters);
    const response = await this.httpClient.post<Record<string, unknown>>(
      `${HF_BASE_PATH}/encounters/$bulk-submit/`,
      bundle
    );
    return mapData(response, (data) =>
      SubmitOperationResponse.fromJSON(data as Record<string, unknown>)
    );
  }
}

export default HealthFacilityEncountersClient;
