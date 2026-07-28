/// <reference types="fhir" />

import HttpClient from "../types";
import ClaimFhirConverter from "../fhir_converter/claims";
import { ClaimModel } from "../models/claim";
import { FhirSearchPage } from "../models/pagination";
import {
  ClaimListFilters,
  EMR_BASE_PATH,
  SubmitOperationResponse,
  asFhirBundle,
  asFhirResource,
  buildQuery,
} from "./types";

class EmrClaimsClient {
  private readonly converter = new ClaimFhirConverter();

  constructor(private readonly httpClient: HttpClient) {}

  async list(
    filters: ClaimListFilters = new ClaimListFilters()
  ): Promise<FhirSearchPage<ClaimModel>> {
    const data = await this.httpClient.get<unknown>(
      `${EMR_BASE_PATH}/claims/${buildQuery(filters.toQuery())}`
    );
    return this.converter.fromSearchBundle(asFhirBundle(data));
  }

  async get(identifier: string): Promise<ClaimModel> {
    const data = await this.httpClient.get<unknown>(
      `${EMR_BASE_PATH}/claims/${encodeURIComponent(identifier)}/`
    );
    return this.converter.fromFhir(asFhirResource<fhir4.Claim>(data));
  }

  async update(identifier: string, claim: ClaimModel): Promise<ClaimModel> {
    const data = await this.httpClient.put<unknown>(
      `${EMR_BASE_PATH}/claims/${encodeURIComponent(identifier)}/`,
      this.converter.toFhir(claim)
    );
    return this.converter.fromFhir(asFhirResource<fhir4.Claim>(data));
  }

  async patch(identifier: string, claim: ClaimModel): Promise<ClaimModel> {
    const data = await this.httpClient.patch<unknown>(
      `${EMR_BASE_PATH}/claims/${encodeURIComponent(identifier)}/`,
      this.converter.toFhir(claim)
    );
    return this.converter.fromFhir(asFhirResource<fhir4.Claim>(data));
  }

  /** POST claims/$submit/ — requires claim admin (header or plugin default). */
  async submit(claims: ClaimModel[]): Promise<SubmitOperationResponse> {
    const bundle = this.converter.toCollectionBundle(claims);
    const data = await this.httpClient.post<Record<string, unknown>>(
      `${EMR_BASE_PATH}/claims/$submit/`,
      bundle
    );
    return SubmitOperationResponse.fromJSON(data);
  }

  async submitBundle(bundle: fhir4.Bundle): Promise<SubmitOperationResponse> {
    const data = await this.httpClient.post<Record<string, unknown>>(
      `${EMR_BASE_PATH}/claims/$submit/`,
      bundle
    );
    return SubmitOperationResponse.fromJSON(data);
  }
}

export default EmrClaimsClient;
