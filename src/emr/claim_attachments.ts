/// <reference types="fhir" />

import HttpClient from "../types";
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
  ): Promise<FhirSearchPage<ClaimAttachmentModel>> {
    const data = await this.httpClient.get<unknown>(
      `${EMR_BASE_PATH}/claim-or-encounter-attachments/${buildQuery(filters.toQuery())}`
    );
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
  }

  async get(identifier: string): Promise<ClaimAttachmentModel> {
    const data = await this.httpClient.get<unknown>(
      `${EMR_BASE_PATH}/claim-or-encounter-attachments/${encodeURIComponent(identifier)}/`
    );
    return documentReferenceFromFhir(
      asFhirResource<fhir4.DocumentReference>(data)
    );
  }

  async create(
    attachment: ClaimAttachmentModel,
    claimUuid?: string
  ): Promise<ClaimAttachmentModel> {
    const data = await this.httpClient.post<unknown>(
      `${EMR_BASE_PATH}/claim-or-encounter-attachments/`,
      documentReferenceToFhir(attachment, claimUuid)
    );
    return documentReferenceFromFhir(
      asFhirResource<fhir4.DocumentReference>(data)
    );
  }

  async delete(identifier: string): Promise<void> {
    await this.httpClient.delete<void>(
      `${EMR_BASE_PATH}/claim-or-encounter-attachments/${encodeURIComponent(identifier)}/`
    );
  }
}

export default EmrClaimAttachmentsClient;
