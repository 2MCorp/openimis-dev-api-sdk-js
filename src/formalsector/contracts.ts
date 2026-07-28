/// <reference types="fhir" />

import HttpClient from "../types";
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

class FormalSectorContractsClient {
  private readonly converter = new ContractFhirConverter();

  constructor(private readonly httpClient: HttpClient) {}

  async list(
    filters: ContractListFilters = new ContractListFilters()
  ): Promise<FhirSearchPage<ContractModel>> {
    const data = await this.httpClient.get<unknown>(
      `${PH_BASE_PATH}/contracts/${buildQuery(filters.toQuery())}`
    );
    return this.converter.fromSearchBundle(asFhirBundle(data));
  }

  async get(pk: string): Promise<ContractModel> {
    const data = await this.httpClient.get<unknown>(
      `${PH_BASE_PATH}/contracts/${encodeURIComponent(pk)}/`
    );
    return this.converter.fromFhir(asFhirResource<fhir4.Contract>(data));
  }

  async create(contract: ContractModel): Promise<ContractModel> {
    const data = await this.httpClient.post<unknown>(
      `${PH_BASE_PATH}/contracts/`,
      this.converter.toFhir(contract)
    );
    return this.converter.fromFhir(asFhirResource<fhir4.Contract>(data));
  }
}

export default FormalSectorContractsClient;
