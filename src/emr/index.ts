import HttpClient from "../types";
import EmrPatientsClient from "./patients";
import EmrClaimsClient from "./claims";
import EmrClaimItemsClient from "./claim_items";
import EmrClaimServicesClient from "./claim_services";
import EmrClaimAttachmentsClient from "./claim_attachments";
import EmrEncountersClient from "./encounters";
import EmrPreauthorizationsClient from "./preauthorizations";
import EmrMedicationsClient from "./medications";
import EmrServicesClient from "./services";
import EmrDiagnosesClient from "./diagnoses";
import EmrFacilitiesClient from "./facilities";
import EmrPatientReferencesClient from "./patient_references";

/**
 * Client for `/emr-developer-api/` plugin endpoints.
 *
 * Auth: Health Facility API key via `sdk.auth.apiKeyAuth.useApiKey(...)`.
 * Writes require claim admin (`X-Claim-Admin-Code` or plugin default).
 */
class EmrDevAPIClient {
  public readonly patients: EmrPatientsClient;
  public readonly claims: EmrClaimsClient;
  public readonly claimItems: EmrClaimItemsClient;
  public readonly claimServices: EmrClaimServicesClient;
  public readonly claimAttachments: EmrClaimAttachmentsClient;
  public readonly encounters: EmrEncountersClient;
  public readonly preauthorizations: EmrPreauthorizationsClient;
  public readonly medications: EmrMedicationsClient;
  public readonly services: EmrServicesClient;
  public readonly diagnoses: EmrDiagnosesClient;
  public readonly facilities: EmrFacilitiesClient;
  public readonly patientReferences: EmrPatientReferencesClient;

  constructor(httpClient: HttpClient) {
    this.patients = new EmrPatientsClient(httpClient);
    this.claims = new EmrClaimsClient(httpClient);
    this.claimItems = new EmrClaimItemsClient(httpClient);
    this.claimServices = new EmrClaimServicesClient(httpClient);
    this.claimAttachments = new EmrClaimAttachmentsClient(httpClient);
    this.encounters = new EmrEncountersClient(httpClient);
    this.preauthorizations = new EmrPreauthorizationsClient(httpClient);
    this.medications = new EmrMedicationsClient(httpClient);
    this.services = new EmrServicesClient(httpClient);
    this.diagnoses = new EmrDiagnosesClient(httpClient);
    this.facilities = new EmrFacilitiesClient(httpClient);
    this.patientReferences = new EmrPatientReferencesClient(httpClient);
  }
}

export default EmrDevAPIClient;
export {
  EmrPatientsClient,
  EmrClaimsClient,
  EmrClaimItemsClient,
  EmrClaimServicesClient,
  EmrClaimAttachmentsClient,
  EmrEncountersClient,
  EmrPreauthorizationsClient,
  EmrMedicationsClient,
  EmrServicesClient,
  EmrDiagnosesClient,
  EmrFacilitiesClient,
  EmrPatientReferencesClient,
};
export * from "./types";
