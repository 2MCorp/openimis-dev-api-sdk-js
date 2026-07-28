/// <reference types="fhir" />

import HttpClient, { ApiResponse, mapData } from "../types";
import { PaymentReconciliationFhirConverter } from "../fhir_converter/payment";
import { PaymentReconciliationModel } from "../models/payment";
import { FhirSearchPage } from "../models/pagination";
import { parseSearchBundle } from "../fhir_converter/helpers";
import {
  FhirListParams,
  PH_BASE_PATH,
  asFhirBundle,
  asFhirResource,
  buildQuery,
} from "./types";

class FormalSectorPaymentsClient {
  private readonly converter = new PaymentReconciliationFhirConverter();

  constructor(private readonly httpClient: HttpClient) {}

  async list(
    params: FhirListParams = new FhirListParams()
  ): Promise<ApiResponse<FhirSearchPage<PaymentReconciliationModel>>> {
    const response = await this.httpClient.get<unknown>(
      `${PH_BASE_PATH}/payments/${buildQuery(params.toQuery())}`
    );
    return mapData(response, (data) => {
      const page = parseSearchBundle(asFhirBundle(data), (resource) =>
        this.converter.fromFhir(resource as fhir4.PaymentReconciliation)
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

  async get(pk: string): Promise<ApiResponse<PaymentReconciliationModel>> {
    const response = await this.httpClient.get<unknown>(
      `${PH_BASE_PATH}/payments/${encodeURIComponent(pk)}/`
    );
    return mapData(response, (data) =>
      this.converter.fromFhir(asFhirResource<fhir4.PaymentReconciliation>(data))
    );
  }
}

export default FormalSectorPaymentsClient;
