/// <reference types="fhir" />

import HttpClient, { ApiResponse, mapData } from "../types";
import HfStaffFhirConverter from "../fhir_converter/hf_staff";
import { CreateStaffPayload, HfStaffModel, UpdateStaffPayload } from "../models/staff";
import { FhirSearchPage } from "../models/pagination";
import {
  FhirListParams,
  HF_BASE_PATH,
  asFhirBundle,
  asFhirResource,
  buildQuery,
} from "./types";

class HealthFacilityStaffsClient {
  private readonly converter = new HfStaffFhirConverter();

  constructor(private readonly httpClient: HttpClient) {}

  async list(
    params: FhirListParams = new FhirListParams()
  ): Promise<ApiResponse<FhirSearchPage<HfStaffModel>>> {
    const response = await this.httpClient.get<unknown>(
      `${HF_BASE_PATH}/staffs/${buildQuery(params.toQuery())}`
    );
    return mapData(response, (data) =>
      this.converter.fromSearchBundle(asFhirBundle(data))
    );
  }

  async get(pk: string): Promise<ApiResponse<HfStaffModel>> {
    const response = await this.httpClient.get<unknown>(
      `${HF_BASE_PATH}/staffs/${encodeURIComponent(pk)}/`
    );
    return mapData(response, (data) =>
      this.converter.fromFhir(asFhirResource<fhir4.PractitionerRole>(data))
    );
  }

  /**
   * Create HF staff. Request body is portal JSON (not FHIR);
   * response is FHIR PractitionerRole.
   */
  async create(
    payload: CreateStaffPayload
  ): Promise<ApiResponse<HfStaffModel>> {
    const response = await this.httpClient.post<unknown>(
      `${HF_BASE_PATH}/staffs/`,
      payload
    );
    return mapData(response, (data) =>
      this.converter.fromFhir(asFhirResource<fhir4.PractitionerRole>(data))
    );
  }

  /**
   * Partial update (deactivate / role). Request body is portal JSON;
   * response is FHIR PractitionerRole.
   */
  async update(
    pk: string,
    payload: UpdateStaffPayload
  ): Promise<ApiResponse<HfStaffModel>> {
    const response = await this.httpClient.patch<unknown>(
      `${HF_BASE_PATH}/staffs/${encodeURIComponent(pk)}/`,
      payload
    );
    return mapData(response, (data) =>
      this.converter.fromFhir(asFhirResource<fhir4.PractitionerRole>(data))
    );
  }
}

export default HealthFacilityStaffsClient;
