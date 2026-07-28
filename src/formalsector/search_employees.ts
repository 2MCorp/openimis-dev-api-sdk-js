/// <reference types="fhir" />

import HttpClient from "../types";
import PatientFhirConverter from "../fhir_converter/patient";
import { PatientModel } from "../models/patient";
import {
  PH_BASE_PATH,
  asFhirResource,
  buildQuery,
} from "./types";

class FormalSectorSearchEmployeesClient {
  private readonly converter = new PatientFhirConverter();

  constructor(private readonly httpClient: HttpClient) {}

  /** Public: GET search-employee/?identifier={chfId} */
  async getByChfId(chfId: string): Promise<PatientModel> {
    const data = await this.httpClient.get<unknown>(
      `${PH_BASE_PATH}/search-employee/${buildQuery({ identifier: chfId })}`,
      { skipAuth: true }
    );
    return this.converter.fromFhir(asFhirResource<fhir4.Patient>(data));
  }

  async getByIdentifier(identifier: string): Promise<PatientModel> {
    const data = await this.httpClient.get<unknown>(
      `${PH_BASE_PATH}/search-employee/${encodeURIComponent(identifier)}/`,
      { skipAuth: true }
    );
    return this.converter.fromFhir(asFhirResource<fhir4.Patient>(data));
  }
}

export default FormalSectorSearchEmployeesClient;
