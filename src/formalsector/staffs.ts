/// <reference types="fhir" />

import HttpClient, { ApiResponse, mapData } from "../types";
import StaffFhirConverter from "../fhir_converter/staff";
import { StaffModel } from "../models/staff";
import { FhirSearchPage } from "../models/pagination";
import {
  FhirListParams,
  PH_BASE_PATH,
  asFhirBundle,
  asFhirResource,
  buildQuery,
} from "./types";

class FormalSectorStaffsClient {
  private readonly converter = new StaffFhirConverter();

  constructor(private readonly httpClient: HttpClient) {}

  async list(
    params: FhirListParams = new FhirListParams()
  ): Promise<ApiResponse<FhirSearchPage<StaffModel>>> {
    const response = await this.httpClient.get<unknown>(
      `${PH_BASE_PATH}/staffs/${buildQuery(params.toQuery())}`
    );
    return mapData(response, (data) =>
      this.converter.fromSearchBundle(asFhirBundle(data))
    );
  }

  async get(pk: string): Promise<ApiResponse<StaffModel>> {
    const response = await this.httpClient.get<unknown>(
      `${PH_BASE_PATH}/staffs/${encodeURIComponent(pk)}/`
    );
    return mapData(response, (data) =>
      this.converter.fromFhir(asFhirResource<fhir4.OrganizationAffiliation>(data))
    );
  }
}

export default FormalSectorStaffsClient;
