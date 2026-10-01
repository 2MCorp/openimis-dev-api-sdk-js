/// <reference types="fhir" />

import HttpClient, { ApiResponse, mapData } from "../types";
import StaffFhirConverter from "../fhir_converter/staff";
import {
  CreateStaffPayload,
  StaffModel,
  UpdateStaffPayload,
  validateStaffAccount,
} from "../models/staff";
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

  /**
   * Create PH staff. Request body is portal JSON (not FHIR);
   * response is FHIR OrganizationAffiliation.
   */
  async create(
    payload: CreateStaffPayload
  ): Promise<ApiResponse<StaffModel>> {
    const errors = validateStaffAccount(payload);
    if (errors.length) return ApiResponse.fail("400", errors[0].message, errors);
    const response = await this.httpClient.post<unknown>(
      `${PH_BASE_PATH}/staffs/`,
      payload
    );
    return mapData(response, (data) =>
      this.converter.fromFhir(asFhirResource<fhir4.OrganizationAffiliation>(data))
    );
  }

  /**
   * Partial update (deactivate / role). Request body is portal JSON;
   * response is FHIR OrganizationAffiliation.
   */
  async update(
    pk: string,
    payload: UpdateStaffPayload
  ): Promise<ApiResponse<StaffModel>> {
    const response = await this.httpClient.patch<unknown>(
      `${PH_BASE_PATH}/staffs/${encodeURIComponent(pk)}/`,
      payload
    );
    return mapData(response, (data) =>
      this.converter.fromFhir(asFhirResource<fhir4.OrganizationAffiliation>(data))
    );
  }
}

export default FormalSectorStaffsClient;
