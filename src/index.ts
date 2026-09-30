import AuthAPIClient from "./auth";
import FormalSectorDevAPIClient from "./formalsector";
import HealthFacilityDevAPIClient from "./healthfacility";
import DashboardDevAPIClient from "./dashboard";
import EmrDevAPIClient from "./emr";
import EnrollmentDevAPIClient from "./enrollment";
import EventBusDevAPIClient from "./event_bus";
import FhirConverter from "./fhir_converter";
import HttpClient, { ApiError, ApiResponse, mapData, passData } from "./types";
import type { AuthScheme, HttpClientOptions, RequestOptions } from "./types";

class OpenIMISDevApiSdk {
  public readonly auth: AuthAPIClient;
  public readonly healthFacility: HealthFacilityDevAPIClient;
  public readonly formalSector: FormalSectorDevAPIClient;
  public readonly dashboard: DashboardDevAPIClient;
  public readonly emr: EmrDevAPIClient;
  public readonly enrollment: EnrollmentDevAPIClient;
  public readonly eventBus: EventBusDevAPIClient;
  public readonly fhir: FhirConverter;

  constructor(httpClient: HttpClient) {
    this.auth = new AuthAPIClient(httpClient);
    this.healthFacility = new HealthFacilityDevAPIClient(httpClient);
    this.formalSector = new FormalSectorDevAPIClient(httpClient);
    this.dashboard = new DashboardDevAPIClient(httpClient);
    this.emr = new EmrDevAPIClient(httpClient);
    this.enrollment = new EnrollmentDevAPIClient(httpClient);
    this.eventBus = new EventBusDevAPIClient(httpClient);
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
  EmrDevAPIClient,
  EnrollmentDevAPIClient,
  EventBusDevAPIClient,
  FhirConverter,
  HttpClient,
  ApiError,
  ApiResponse,
  mapData,
  passData,
};
export type { AuthScheme, HttpClientOptions, RequestOptions };
export * from "./auth/types";
export * from "./models";
export * from "./fhir_converter";
export * from "./healthfacility/types";
export {
  BulkPreauthorizationResult,
  validatePreauthorizationForCreate,
  collectPreauthorizationValidationErrors,
} from "./healthfacility/preauthorization_ops";
export type { BulkPreauthorizationError } from "./healthfacility/preauthorization_ops";
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
export { EMR_BASE_PATH } from "./emr/types";
export {
  ENROLLMENT_BASE_PATH,
  EnrollmentRecord,
  EnrollmentListResult,
  EnrollmentActionResult,
} from "./enrollment/types";
export type {
  HealthFacilityRegistrationPayload,
  HealthFacilityAccountClaimPayload,
  PolicyHolderRegistrationPayload,
  PolicyHolderAccountClaimPayload,
} from "./enrollment/types";
export {
  EventBusClient,
  parseHfClaimLifecycleData,
  parseHfUpdateData,
  parseHfMutationData,
  SseStreamParser,
  EVENT_BUS_BASE_PATH,
  HF_UPDATE_SSE_PATH,
  HF_MUTATION_SSE_PATH,
  PH_UPDATE_SSE_PATH,
  PH_MUTATION_SSE_PATH,
  HF_UPDATE_EVENT_TYPE,
  HF_MUTATION_EVENT_TYPE,
} from "./event_bus";
export type {
  HfClaimLifecycleNotification,
  HfMutationNotification,
  HfUpdateEntity,
  HfSseStreamKind,
  SseWireEvent,
  SseSubscription,
  EventBusSubscribeOptions,
  HfUpdateSubscribeOptions,
  HfMutationSubscribeOptions,
} from "./event_bus";
