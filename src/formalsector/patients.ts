/// <reference types="fhir" />

import HttpClient, { ApiResponse, mapData } from "../types";
import PatientFhirConverter from "../fhir_converter/patient";
import { PatientModel } from "../models/patient";
import { PH_BASE_PATH, asFhirResource, buildQuery } from "./types";

/**
 * `patients/` — insuree demographics restricted to the employer's own employees
 * (requires `api_auth.view_employees`). Prefer this over `search-employee/`, which is
 * unauthenticated and searches every insuree in the system.
 */
class FormalSectorPatientsClient {
  private readonly converter = new PatientFhirConverter();

  constructor(private readonly httpClient: HttpClient) {}

  /** GET patients/{chfId}/ — 404 when the insuree is not one of the employer's employees. */
  async getByChfId(chfId: string): Promise<ApiResponse<PatientModel>> {
    const response = await this.httpClient.get<unknown>(
      `${PH_BASE_PATH}/patients/${encodeURIComponent(chfId)}/`
    );
    return mapData(response, (data) =>
      this.converter.fromFhir(asFhirResource<fhir4.Patient>(data))
    );
  }

  /** GET patients/?identifier={chfId} */
  async search(identifier: string): Promise<ApiResponse<PatientModel>> {
    const response = await this.httpClient.get<unknown>(
      `${PH_BASE_PATH}/patients/${buildQuery({ identifier })}`
    );
    return mapData(response, (data) =>
      this.converter.fromFhir(asFhirResource<fhir4.Patient>(data))
    );
  }
}

export default FormalSectorPatientsClient;
