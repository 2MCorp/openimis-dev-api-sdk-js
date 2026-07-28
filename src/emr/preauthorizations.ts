/// <reference types="fhir" />

import HttpClient, { ApiResponse, mapData } from "../types";
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
  ): Promise<ApiResponse<FhirSearchPage<PreauthorizationModel>>> {
    const response = await this.httpClient.get<unknown>(
      `${EMR_BASE_PATH}/preauthorizations/${buildQuery(filters.toQuery())}`
    );
    return mapData(response, (data) =>
      this.converter.fromSearchBundle(asFhirBundle(data))
    );
  }

  async get(identifier: string): Promise<ApiResponse<PreauthorizationModel>> {
    const response = await this.httpClient.get<unknown>(
      `${EMR_BASE_PATH}/preauthorizations/${encodeURIComponent(identifier)}/`
    );
    return mapData(response, (data) =>
      this.converter.fromFhir(asFhirResource<fhir4.Claim>(data))
    );
  }

  async create(
    preauthorization: PreauthorizationModel
  ): Promise<ApiResponse<PreauthorizationModel>> {
    const response = await this.httpClient.post<unknown>(
      `${EMR_BASE_PATH}/preauthorizations/`,
      this.converter.toFhir(preauthorization)
    );
    return mapData(response, (data) =>
      this.converter.fromFhir(asFhirResource<fhir4.Claim>(data))
    );
  }

  async update(
    identifier: string,
    preauthorization: PreauthorizationModel
  ): Promise<ApiResponse<PreauthorizationModel>> {
    const response = await this.httpClient.put<unknown>(
      `${EMR_BASE_PATH}/preauthorizations/${encodeURIComponent(identifier)}/`,
      this.converter.toFhir(preauthorization)
    );
    return mapData(response, (data) =>
      this.converter.fromFhir(asFhirResource<fhir4.Claim>(data))
    );
  }
}

export default EmrPreauthorizationsClient;
