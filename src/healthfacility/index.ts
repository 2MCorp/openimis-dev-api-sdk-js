import HttpClient from "../types";
import HealthFacilityPatientsClient from "./patients";
import HealthFacilityClaimsClient from "./claims";
import HealthFacilityClaimItemsClient from "./claim_items";
import HealthFacilityClaimServicesClient from "./claim_services";
import HealthFacilityClaimAttachmentsClient from "./claim_attachments";
import HealthFacilityEncountersClient from "./encounters";
import HealthFacilityPreauthorizationsClient from "./preauthorizations";
import HealthFacilityMedicationsClient from "./medications";
import HealthFacilityServicesClient from "./services";
import HealthFacilityDiagnosesClient from "./diagnoses";
import HealthFacilityFacilitiesClient from "./facilities";
import HealthFacilityPatientReferencesClient from "./patient_references";
import HealthFacilityStaffsClient from "./staffs";
import HealthFacilityClientConfigClient from "./client_config";
import HealthFacilityBulkClient from "./bulk";

/**
 * Client for `/health-facility-dev-api/` plugin endpoints.
 */
class HealthFacilityDevAPIClient {
  public readonly patients: HealthFacilityPatientsClient;
  public readonly claims: HealthFacilityClaimsClient;
  public readonly claimItems: HealthFacilityClaimItemsClient;
  public readonly claimServices: HealthFacilityClaimServicesClient;
  public readonly claimAttachments: HealthFacilityClaimAttachmentsClient;
  public readonly encounters: HealthFacilityEncountersClient;
  public readonly preauthorizations: HealthFacilityPreauthorizationsClient;
  public readonly medications: HealthFacilityMedicationsClient;
  public readonly services: HealthFacilityServicesClient;
  public readonly diagnoses: HealthFacilityDiagnosesClient;
  public readonly facilities: HealthFacilityFacilitiesClient;
  public readonly patientReferences: HealthFacilityPatientReferencesClient;
  public readonly staffs: HealthFacilityStaffsClient;
  public readonly clientConfig: HealthFacilityClientConfigClient;
  public readonly bulk: HealthFacilityBulkClient;

  constructor(httpClient: HttpClient) {
    this.patients = new HealthFacilityPatientsClient(httpClient);
    this.claims = new HealthFacilityClaimsClient(httpClient);
    this.claimItems = new HealthFacilityClaimItemsClient(httpClient);
    this.claimServices = new HealthFacilityClaimServicesClient(httpClient);
    this.claimAttachments = new HealthFacilityClaimAttachmentsClient(
      httpClient,
    );
    this.encounters = new HealthFacilityEncountersClient(httpClient);
    this.preauthorizations = new HealthFacilityPreauthorizationsClient(
      httpClient,
    );
    this.medications = new HealthFacilityMedicationsClient(httpClient);
    this.services = new HealthFacilityServicesClient(httpClient);
    this.diagnoses = new HealthFacilityDiagnosesClient(httpClient);
    this.facilities = new HealthFacilityFacilitiesClient(httpClient);
    this.patientReferences = new HealthFacilityPatientReferencesClient(
      httpClient,
    );
    this.staffs = new HealthFacilityStaffsClient(httpClient);
    this.clientConfig = new HealthFacilityClientConfigClient(httpClient);
    this.bulk = new HealthFacilityBulkClient(httpClient);
  }
}

export default HealthFacilityDevAPIClient;
export {
  HealthFacilityPatientsClient,
  HealthFacilityClaimsClient,
  HealthFacilityClaimItemsClient,
  HealthFacilityClaimServicesClient,
  HealthFacilityClaimAttachmentsClient,
  HealthFacilityEncountersClient,
  HealthFacilityPreauthorizationsClient,
  HealthFacilityMedicationsClient,
  HealthFacilityServicesClient,
  HealthFacilityDiagnosesClient,
  HealthFacilityFacilitiesClient,
  HealthFacilityPatientReferencesClient,
  HealthFacilityStaffsClient,
  HealthFacilityClientConfigClient,
  HealthFacilityBulkClient,
};
export * from "./types";
export type {
  HfClientConfig,
  HfClaimFormConfig,
  HfMoneyConfig,
} from "./client_config";
