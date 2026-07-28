/// <reference types="fhir" />

import HttpClient from "../types";
import PreauthorizationFhirConverter from "../fhir_converter/preauthorization";
import { PreauthorizationModel } from "../models/preauthorization";
import { FhirSearchPage } from "../models/pagination";
import {
  EMR_BASE_PATH,
  PreauthorizationListFilters,
  asFhirBundle,
  asFhirResource,
  buildQuery,
} from "./types";

class EmrPreauthorizationsClient {
  private readonly converter = new PreauthorizationFhirConverter();

  constructor(private readonly httpClient: HttpClient) {}

  async list(
    filters: PreauthorizationListFilters = new PreauthorizationListFilters()
  ): Promise<FhirSearchPage<PreauthorizationModel>> {
    const data = await this.httpClient.get<unknown>(
      `${EMR_BASE_PATH}/preauthorizations/${buildQuery(filters.toQuery())}`
    );
    return this.converter.fromSearchBundle(asFhirBundle(data));
  }

  async get(identifier: string): Promise<PreauthorizationModel> {
    const data = await this.httpClient.get<unknown>(
      `${EMR_BASE_PATH}/preauthorizations/${encodeURIComponent(identifier)}/`
    );
    return this.converter.fromFhir(asFhirResource<fhir4.Claim>(data));
  }

  async create(
    preauthorization: PreauthorizationModel
  ): Promise<PreauthorizationModel> {
    const data = await this.httpClient.post<unknown>(
      `${EMR_BASE_PATH}/preauthorizations/`,
      this.converter.toFhir(preauthorization)
    );
    return this.converter.fromFhir(asFhirResource<fhir4.Claim>(data));
  }

  async update(
    identifier: string,
    preauthorization: PreauthorizationModel
  ): Promise<PreauthorizationModel> {
    const data = await this.httpClient.put<unknown>(
      `${EMR_BASE_PATH}/preauthorizations/${encodeURIComponent(identifier)}/`,
      this.converter.toFhir(preauthorization)
    );
    return this.converter.fromFhir(asFhirResource<fhir4.Claim>(data));
  }
}

export default EmrPreauthorizationsClient;
