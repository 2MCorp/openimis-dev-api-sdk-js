/// <reference types="fhir" />

import HttpClient, { ApiResponse, mapData } from "../types";
import ContractFhirConverter from "../fhir_converter/contract";
import { ContractModel } from "../models/contract";
import { FhirSearchPage } from "../models/pagination";
import {
  ContractListFilters,
  PH_BASE_PATH,
  asFhirBundle,
  asFhirResource,
  buildQuery,
} from "./types";
import { ContractDraftInput, contractModelForDraft, validateContractDraft } from "./contract_ops";

class FormalSectorContractsClient {
  private readonly converter = new ContractFhirConverter();

  constructor(private readonly httpClient: HttpClient) {}

  async list(
    filters: ContractListFilters = new ContractListFilters()
  ): Promise<ApiResponse<FhirSearchPage<ContractModel>>> {
    const response = await this.httpClient.get<unknown>(
      `${PH_BASE_PATH}/contracts/${buildQuery(filters.toQuery())}`
    );
    return mapData(response, (data) =>
      this.converter.fromSearchBundle(asFhirBundle(data))
    );
  }

  async get(pk: string): Promise<ApiResponse<ContractModel>> {
    const response = await this.httpClient.get<unknown>(
      `${PH_BASE_PATH}/contracts/${encodeURIComponent(pk)}/`
    );
    return mapData(response, (data) =>
      this.converter.fromFhir(asFhirResource<fhir4.Contract>(data))
    );
  }

  /** Validate and create a draft contract; field errors come back in `errorDetails`. */
  async createDraft(input: ContractDraftInput): Promise<ApiResponse<ContractModel>> {
    const errors = validateContractDraft(input);
    if (errors.length) {
      return ApiResponse.fail("400", errors[0].message, errors);
    }
    return this.create(contractModelForDraft(input));
  }

  async create(contract: ContractModel): Promise<ApiResponse<ContractModel>> {
    const response = await this.httpClient.post<unknown>(
      `${PH_BASE_PATH}/contracts/`,
      this.converter.toFhir(contract)
    );
    return mapData(response, (data) =>
      this.converter.fromFhir(asFhirResource<fhir4.Contract>(data))
    );
  }
}

export default FormalSectorContractsClient;
