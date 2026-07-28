/// <reference types="fhir" />

import HttpClient, { ApiResponse, mapData, passData } from "../types";
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
  ): Promise<ApiResponse<FhirSearchPage<ClaimChargeItemModel>>> {
    const response = await this.httpClient.get<unknown>(
      `${EMR_BASE_PATH}/claim-or-encounter-services/${buildQuery(filters.toQuery())}`
    );
    return mapData(response, (data) => {
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
    });
  }

  async get(identifier: string): Promise<ApiResponse<ClaimChargeItemModel>> {
    const response = await this.httpClient.get<unknown>(
      `${EMR_BASE_PATH}/claim-or-encounter-services/${encodeURIComponent(identifier)}/`
    );
    return mapData(response, (data) =>
      chargeItemFromFhir(asFhirResource<fhir4.ChargeItem>(data), "service")
    );
  }

  async create(service: ClaimChargeItemModel): Promise<ApiResponse<ClaimChargeItemModel>> {
    const response = await this.httpClient.post<unknown>(
      `${EMR_BASE_PATH}/claim-or-encounter-services/`,
      chargeItemToFhir(service)
    );
    return mapData(response, (data) =>
      chargeItemFromFhir(asFhirResource<fhir4.ChargeItem>(data), "service")
    );
  }

  async delete(identifier: string): Promise<ApiResponse<null>> {
    const response = await this.httpClient.delete(
      `${EMR_BASE_PATH}/claim-or-encounter-services/${encodeURIComponent(identifier)}/`
    );
    return passData<null>(response, "Deleted");
  }
}

export default EmrClaimServicesClient;
