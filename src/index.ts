import AuthAPIClient from "./auth";
import FormalSectorDevAPIClient from "./formalsector";
import HealthFacilityDevAPIClient from "./healthfacility";
import FhirConverter from "./fhir_converter";
import HttpClient, { ApiError } from "./types";
import type { AuthScheme, HttpClientOptions, RequestOptions } from "./types";

class OpenIMISDevApiSdk {
  public readonly auth: AuthAPIClient;
  public readonly healthFacility: HealthFacilityDevAPIClient;
  public readonly formalSector: FormalSectorDevAPIClient;
  public readonly fhir: FhirConverter;

  constructor(httpClient: HttpClient) {
    this.auth = new AuthAPIClient(httpClient);
    this.healthFacility = new HealthFacilityDevAPIClient(httpClient);
    this.formalSector = new FormalSectorDevAPIClient(httpClient);
    this.fhir = new FhirConverter();
  }
}

export default OpenIMISDevApiSdk;
export {
  OpenIMISDevApiSdk,
  AuthAPIClient,
  FormalSectorDevAPIClient,
  HealthFacilityDevAPIClient,
  FhirConverter,
  HttpClient,
  ApiError,
};
export type { AuthScheme, HttpClientOptions, RequestOptions };
export * from "./auth/types";
export * from "./models";
export * from "./fhir_converter";
