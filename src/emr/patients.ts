/// <reference types="fhir" />

import HttpClient, { ApiResponse, mapData } from "../types";
import PatientFhirConverter from "../fhir_converter/patient";
import { PatientModel } from "../models/patient";
import { EMR_BASE_PATH, asFhirResource, buildQuery } from "./types";

class EmrPatientsClient {
  private readonly converter = new PatientFhirConverter();

  constructor(private readonly httpClient: HttpClient) {}

  /** GET search-patient/?identifier={chfId} — requires Api-Key. */
  async getByChfId(chfId: string): Promise<ApiResponse<PatientModel>> {
    const response = await this.httpClient.get<unknown>(
      `${EMR_BASE_PATH}/search-patient/${buildQuery({ identifier: chfId })}`
    );
    return mapData(response, (data) =>
      this.converter.fromFhir(asFhirResource<fhir4.Patient>(data))
    );
  }

  /** GET search-patient/{identifier}/ — requires Api-Key. */
  async getByIdentifier(identifier: string): Promise<ApiResponse<PatientModel>> {
    const response = await this.httpClient.get<unknown>(
      `${EMR_BASE_PATH}/search-patient/${encodeURIComponent(identifier)}/`
    );
    return mapData(response, (data) =>
      this.converter.fromFhir(asFhirResource<fhir4.Patient>(data))
    );
  }
}

export default EmrPatientsClient;
