/// <reference types="fhir" />

import HttpClient, { ApiResponse, mapData, passData } from "../types";
import { ClaimAttachmentModel } from "../models/claim";
import { FhirSearchPage } from "../models/pagination";
import { parseSearchBundle } from "../fhir_converter/helpers";
import {
  documentReferenceFromFhir,
  documentReferenceToFhir,
} from "../healthfacility/mappers";
import {
  ClaimLineListFilters,
  EMR_BASE_PATH,
  asFhirBundle,
  asFhirResource,
  buildQuery,
} from "./types";

/** Claim attachments — list/get/create/delete (no update on EMR backend). */
class EmrClaimAttachmentsClient {
  constructor(private readonly httpClient: HttpClient) {}

  async list(
    filters: ClaimLineListFilters = new ClaimLineListFilters()
  ): Promise<ApiResponse<FhirSearchPage<ClaimAttachmentModel>>> {
    const response = await this.httpClient.get<unknown>(
      `${EMR_BASE_PATH}/claim-or-encounter-attachments/${buildQuery(filters.toQuery())}`
    );
    return mapData(response, (data) => {
      const page = parseSearchBundle(asFhirBundle(data), (resource) =>
        documentReferenceFromFhir(resource as fhir4.DocumentReference)
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

  async get(identifier: string): Promise<ApiResponse<ClaimAttachmentModel>> {
    const response = await this.httpClient.get<unknown>(
      `${EMR_BASE_PATH}/claim-or-encounter-attachments/${encodeURIComponent(identifier)}/`
    );
    return mapData(response, (data) =>
      documentReferenceFromFhir(asFhirResource<fhir4.DocumentReference>(data))
    );
  }

  async create(
    attachment: ClaimAttachmentModel,
    claimUuid?: string
  ): Promise<ApiResponse<ClaimAttachmentModel>> {
    const response = await this.httpClient.post<unknown>(
      `${EMR_BASE_PATH}/claim-or-encounter-attachments/`,
      documentReferenceToFhir(attachment, claimUuid)
    );
    return mapData(response, (data) =>
      documentReferenceFromFhir(asFhirResource<fhir4.DocumentReference>(data))
    );
  }

  async delete(identifier: string): Promise<ApiResponse<null>> {
    const response = await this.httpClient.delete(
      `${EMR_BASE_PATH}/claim-or-encounter-attachments/${encodeURIComponent(identifier)}/`
    );
    return passData<null>(response, "Deleted");
  }
}

export default EmrClaimAttachmentsClient;
