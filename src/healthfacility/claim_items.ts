/// <reference types="fhir" />

import HttpClient from "../types";
import { ClaimChargeItemModel } from "../models/claim_charge_item";
import { FhirSearchPage } from "../models/pagination";
import { parseSearchBundle } from "../fhir_converter/helpers";
import { chargeItemFromFhir, chargeItemToFhir } from "./mappers";
import {
  ClaimLineListFilters,
  HF_BASE_PATH,
  asFhirBundle,
  asFhirResource,
  buildQuery,
} from "./types";

class HealthFacilityClaimItemsClient {
  constructor(private readonly httpClient: HttpClient) {}

  async list(
    filters: ClaimLineListFilters = new ClaimLineListFilters()
  ): Promise<FhirSearchPage<ClaimChargeItemModel>> {
    const data = await this.httpClient.get<unknown>(
      `${HF_BASE_PATH}/claim-or-encounter-items/${buildQuery(filters.toQuery())}`
    );
    const page = parseSearchBundle(asFhirBundle(data), (resource) =>
      chargeItemFromFhir(resource as fhir4.ChargeItem, "item")
    );
    return new FhirSearchPage(
      page.total,
      page.items,
      page.selfUrl,
      page.nextUrl,
      page.previousUrl
    );
  }

  async get(identifier: string): Promise<ClaimChargeItemModel> {
    const data = await this.httpClient.get<unknown>(
      `${HF_BASE_PATH}/claim-or-encounter-items/${encodeURIComponent(identifier)}/`
    );
    return chargeItemFromFhir(
      asFhirResource<fhir4.ChargeItem>(data),
      "item"
    );
  }

  async create(item: ClaimChargeItemModel): Promise<ClaimChargeItemModel> {
    const data = await this.httpClient.post<unknown>(
      `${HF_BASE_PATH}/claim-or-encounter-items/`,
      chargeItemToFhir(item)
    );
    return chargeItemFromFhir(
      asFhirResource<fhir4.ChargeItem>(data),
      "item"
    );
  }

  async update(
    identifier: string,
    item: ClaimChargeItemModel
  ): Promise<ClaimChargeItemModel> {
    const data = await this.httpClient.put<unknown>(
      `${HF_BASE_PATH}/claim-or-encounter-items/${encodeURIComponent(identifier)}/`,
      chargeItemToFhir(item)
    );
    return chargeItemFromFhir(
      asFhirResource<fhir4.ChargeItem>(data),
      "item"
    );
  }

  async delete(identifier: string): Promise<void> {
    await this.httpClient.delete<void>(
      `${HF_BASE_PATH}/claim-or-encounter-items/${encodeURIComponent(identifier)}/`
    );
  }
}

export default HealthFacilityClaimItemsClient;
