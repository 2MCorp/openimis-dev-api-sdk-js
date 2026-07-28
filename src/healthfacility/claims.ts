/// <reference types="fhir" />

import HttpClient, { ApiResponse, mapData } from "../types";
import ClaimFhirConverter from "../fhir_converter/claims";
import { ClaimModel } from "../models/claim";
import { FhirSearchPage } from "../models/pagination";
import {
  ClaimListFilters,
  HF_BASE_PATH,
  SubmitOperationResponse,
  asFhirBundle,
  asFhirResource,
  buildQuery,
} from "./types";

class HealthFacilityClaimsClient {
  private readonly converter = new ClaimFhirConverter();

  constructor(private readonly httpClient: HttpClient) {}

  async list(
    filters: ClaimListFilters = new ClaimListFilters()
  ): Promise<ApiResponse<FhirSearchPage<ClaimModel>>> {
    const response = await this.httpClient.get<unknown>(
      `${HF_BASE_PATH}/claims/${buildQuery(filters.toQuery())}`
    );
    return mapData(response, (data) =>
      this.converter.fromSearchBundle(asFhirBundle(data))
    );
  }

  async get(identifier: string): Promise<ApiResponse<ClaimModel>> {
    const response = await this.httpClient.get<unknown>(
      `${HF_BASE_PATH}/claims/${encodeURIComponent(identifier)}/`
    );
    return mapData(response, (data) =>
      this.converter.fromFhir(asFhirResource<fhir4.Claim>(data))
    );
  }

  async update(identifier: string, claim: ClaimModel): Promise<ApiResponse<ClaimModel>> {
    const response = await this.httpClient.put<unknown>(
      `${HF_BASE_PATH}/claims/${encodeURIComponent(identifier)}/`,
      this.converter.toFhir(claim)
    );
    return mapData(response, (data) =>
      this.converter.fromFhir(asFhirResource<fhir4.Claim>(data))
    );
  }

  async patch(identifier: string, claim: ClaimModel): Promise<ApiResponse<ClaimModel>> {
    const response = await this.httpClient.patch<unknown>(
      `${HF_BASE_PATH}/claims/${encodeURIComponent(identifier)}/`,
      this.converter.toFhir(claim)
    );
    return mapData(response, (data) =>
      this.converter.fromFhir(asFhirResource<fhir4.Claim>(data))
    );
  }

  /** POST claims/$submit/ — body is a collection Bundle of Claims. */
  async submit(claims: ClaimModel[]): Promise<ApiResponse<SubmitOperationResponse>> {
    const bundle = this.converter.toCollectionBundle(claims);
    const response = await this.httpClient.post<Record<string, unknown>>(
      `${HF_BASE_PATH}/claims/$submit/`,
      bundle
    );
    return mapData(response, (data) =>
      SubmitOperationResponse.fromJSON(data as Record<string, unknown>)
    );
  }

  async submitBundle(bundle: fhir4.Bundle): Promise<ApiResponse<SubmitOperationResponse>> {
    const response = await this.httpClient.post<Record<string, unknown>>(
      `${HF_BASE_PATH}/claims/$submit/`,
      bundle
    );
    return mapData(response, (data) =>
      SubmitOperationResponse.fromJSON(data as Record<string, unknown>)
    );
  }
}

export default HealthFacilityClaimsClient;
