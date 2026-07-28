/// <reference types="fhir" />

import HttpClient from "../types";
import { ClaimChargeItemModel } from "../models/claim_charge_item";
import { FhirSearchPage } from "../models/pagination";
import { parseSearchBundle } from "../fhir_converter/helpers";
import {
  chargeItemFromFhir,
  chargeItemToFhir,
} from "../healthfacility/mappers";
import {
  ClaimLineListFilters,
  EMR_BASE_PATH,
  asFhirBundle,
  asFhirResource,
  buildQuery,
} from "./types";

/** Claim services — list/get/create/delete (no update on EMR backend). */
class EmrClaimServicesClient {
  constructor(private readonly httpClient: HttpClient) {}

  async list(
    filters: ClaimLineListFilters = new ClaimLineListFilters()
  ): Promise<FhirSearchPage<ClaimChargeItemModel>> {
    const data = await this.httpClient.get<unknown>(
      `${EMR_BASE_PATH}/claim-or-encounter-services/${buildQuery(filters.toQuery())}`
    );
    const page = parseSearchBundle(asFhirBundle(data), (resource) =>
      chargeItemFromFhir(resource as fhir4.ChargeItem, "service")
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
      `${EMR_BASE_PATH}/claim-or-encounter-services/${encodeURIComponent(identifier)}/`
    );
    return chargeItemFromFhir(
      asFhirResource<fhir4.ChargeItem>(data),
      "service"
    );
  }

  async create(service: ClaimChargeItemModel): Promise<ClaimChargeItemModel> {
    const data = await this.httpClient.post<unknown>(
      `${EMR_BASE_PATH}/claim-or-encounter-services/`,
      chargeItemToFhir(service)
    );
    return chargeItemFromFhir(
      asFhirResource<fhir4.ChargeItem>(data),
      "service"
    );
  }

  async delete(identifier: string): Promise<void> {
    await this.httpClient.delete<void>(
      `${EMR_BASE_PATH}/claim-or-encounter-services/${encodeURIComponent(identifier)}/`
    );
  }
}

export default EmrClaimServicesClient;
