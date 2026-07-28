/// <reference types="fhir" />

import HttpClient from "../types";
import PatientFhirConverter from "../fhir_converter/patient";
import { PatientModel } from "../models/patient";
import { HF_BASE_PATH, asFhirResource, buildQuery } from "./types";

class HealthFacilityPatientsClient {
  private readonly converter = new PatientFhirConverter();

  constructor(private readonly httpClient: HttpClient) {}

  /** Public endpoint: GET search-patient/?identifier={chfId} */
  async getByChfId(chfId: string): Promise<PatientModel> {
    const data = await this.httpClient.get<unknown>(
      `${HF_BASE_PATH}/search-patient/${buildQuery({ identifier: chfId })}`,
      { skipAuth: true }
    );
    return this.converter.fromFhir(asFhirResource<fhir4.Patient>(data));
  }

  /** Public endpoint: GET search-patient/{identifier}/ */
  async getByIdentifier(identifier: string): Promise<PatientModel> {
    const data = await this.httpClient.get<unknown>(
      `${HF_BASE_PATH}/search-patient/${encodeURIComponent(identifier)}/`,
      { skipAuth: true }
    );
    return this.converter.fromFhir(asFhirResource<fhir4.Patient>(data));
  }
}

export default HealthFacilityPatientsClient;
