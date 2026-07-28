/// <reference types="fhir" />

import HttpClient, { ApiResponse, mapData } from "../types";
import ClaimFhirConverter from "../fhir_converter/claims";
import { ClaimModel } from "../models/claim";
import { FhirSearchPage } from "../models/pagination";
import {
  EmployeeClaimListFilters,
  PH_BASE_PATH,
  asFhirBundle,
  asFhirResource,
  buildQuery,
} from "./types";

class FormalSectorEmployeeClaimsClient {
  private readonly converter = new ClaimFhirConverter();

  constructor(private readonly httpClient: HttpClient) {}

  /**
   * List claims for a policy-holder employee.
   * `filters.identifier` (PolicyHolderInsuree UUID) is required by the backend.
   */
  async list(
    filters: EmployeeClaimListFilters
  ): Promise<ApiResponse<FhirSearchPage<ClaimModel>>> {
    if (!filters.identifier) {
      return ApiResponse.fail(
        "400",
        "employeeClaims.list requires identifier (PolicyHolderInsuree UUID)"
      );
    }

    const response = await this.httpClient.get<unknown>(
      `${PH_BASE_PATH}/employee-claims/${buildQuery(filters.toQuery())}`
    );
    return mapData(response, (data) =>
      this.converter.fromSearchBundle(asFhirBundle(data))
    );
  }

  async get(pk: string): Promise<ApiResponse<ClaimModel>> {
    const response = await this.httpClient.get<unknown>(
      `${PH_BASE_PATH}/employee-claims/${encodeURIComponent(pk)}/`
    );
    return mapData(response, (data) =>
      this.converter.fromFhir(asFhirResource<fhir4.Claim>(data))
    );
  }
}

export default FormalSectorEmployeeClaimsClient;
