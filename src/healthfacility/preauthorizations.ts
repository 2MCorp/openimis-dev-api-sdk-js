/// <reference types="fhir" />

import HttpClient, { ApiResponse, mapData } from "../types";
import PreauthorizationFhirConverter from "../fhir_converter/preauthorization";
import { PreauthorizationModel } from "../models/preauthorization";
import { FhirSearchPage } from "../models/pagination";
import {
  BulkPreauthorizationResult,
  collectPreauthorizationValidationErrors,
} from "./preauthorization_ops";
import {
  HF_BASE_PATH,
  PreauthorizationListFilters,
  asFhirBundle,
  asFhirResource,
  buildQuery,
} from "./types";

class HealthFacilityPreauthorizationsClient {
  private readonly converter = new PreauthorizationFhirConverter();

  constructor(private readonly httpClient: HttpClient) {}

  async list(
    filters: PreauthorizationListFilters = new PreauthorizationListFilters()
  ): Promise<ApiResponse<FhirSearchPage<PreauthorizationModel>>> {
    const response = await this.httpClient.get<unknown>(
      `${HF_BASE_PATH}/preauthorizations/${buildQuery(filters.toQuery())}`
    );
    return mapData(response, (data) =>
      this.converter.fromSearchBundle(asFhirBundle(data))
    );
  }

  async get(identifier: string): Promise<ApiResponse<PreauthorizationModel>> {
    const response = await this.httpClient.get<unknown>(
      `${HF_BASE_PATH}/preauthorizations/${encodeURIComponent(identifier)}/`
    );
    return mapData(response, (data) =>
      this.converter.fromFhir(asFhirResource<fhir4.Claim>(data))
    );
  }

  async create(
    preauthorization: PreauthorizationModel
  ): Promise<ApiResponse<PreauthorizationModel>> {
    const validation = collectPreauthorizationValidationErrors([
      preauthorization,
    ]);
    if (validation.length) {
      return ApiResponse.fail(
        400,
        validation[0]!.message,
        validation.map((e) => e.message)
      );
    }

    const response = await this.httpClient.post<unknown>(
      `${HF_BASE_PATH}/preauthorizations/`,
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
    const validation = collectPreauthorizationValidationErrors([
      preauthorization,
    ]);
    if (validation.length) {
      return ApiResponse.fail(
        400,
        validation[0]!.message,
        validation.map((e) => e.message)
      );
    }

    const response = await this.httpClient.put<unknown>(
      `${HF_BASE_PATH}/preauthorizations/${encodeURIComponent(identifier)}/`,
      this.converter.toFhir(preauthorization)
    );
    return mapData(response, (data) =>
      this.converter.fromFhir(asFhirResource<fhir4.Claim>(data))
    );
  }

  /**
   * Create many preauthorizations via FHIR collection Bundle.
   * Partial success: HTTP 200 with per-item errors.
   */
  async bulkCreate(
    items: PreauthorizationModel[]
  ): Promise<ApiResponse<BulkPreauthorizationResult>> {
    if (!items.length) {
      return ApiResponse.fail(400, "At least one preauthorization is required");
    }

    const clientErrors = collectPreauthorizationValidationErrors(items);
    if (clientErrors.length) {
      return ApiResponse.ok(
        new BulkPreauthorizationResult(
          [],
          clientErrors,
          "Client validation failed"
        ),
        400,
        "Client validation failed"
      );
    }

    const bundle = this.converter.toCollectionBundle(items);
    const response = await this.httpClient.post<Record<string, unknown>>(
      `${HF_BASE_PATH}/preauthorizations/$bulk-create/`,
      bundle
    );
    return mapData(response, (data) =>
      BulkPreauthorizationResult.fromJSON(
        data as Record<string, unknown>,
        this.converter
      )
    );
  }
}

export default HealthFacilityPreauthorizationsClient;
