import AuthAPIClient from "./auth";
import FormalSectorDevAPIClient from "./formalsector";
import HealthFacilityDevAPIClient from "./healthfacility";
import DashboardDevAPIClient from "./dashboard";
import FhirConverter from "./fhir_converter";
import HttpClient, { ApiError } from "./types";
import type { AuthScheme, HttpClientOptions, RequestOptions } from "./types";

class OpenIMISDevApiSdk {
  public readonly auth: AuthAPIClient;
  public readonly healthFacility: HealthFacilityDevAPIClient;
  public readonly formalSector: FormalSectorDevAPIClient;
  public readonly dashboard: DashboardDevAPIClient;
  public readonly fhir: FhirConverter;

  constructor(httpClient: HttpClient) {
    this.auth = new AuthAPIClient(httpClient);
    this.healthFacility = new HealthFacilityDevAPIClient(httpClient);
    this.formalSector = new FormalSectorDevAPIClient(httpClient);
    this.dashboard = new DashboardDevAPIClient(httpClient);
    this.fhir = new FhirConverter();
  }
}

export default OpenIMISDevApiSdk;
export {
  OpenIMISDevApiSdk,
  AuthAPIClient,
  FormalSectorDevAPIClient,
  HealthFacilityDevAPIClient,
  DashboardDevAPIClient,
  FhirConverter,
  HttpClient,
  ApiError,
};
export type { AuthScheme, HttpClientOptions, RequestOptions };
export * from "./auth/types";
export * from "./models";
export * from "./fhir_converter";
export * from "./healthfacility/types";
export {
  PH_BASE_PATH,
  EmployeeListFilters,
  ContractListFilters,
  InsurancePlanListFilters,
  EmployeeClaimListFilters,
  EmployeeBinaryUploadQuery,
} from "./formalsector/types";
export {
  DASHBOARD_BASE_PATH,
  DashboardQueryParams,
} from "./dashboard/types";
export * from "./dashboard/models";
