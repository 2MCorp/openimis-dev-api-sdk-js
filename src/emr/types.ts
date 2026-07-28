/// <reference types="fhir" />

/**
 * EMR Developer API — server-to-server FHIR integration.
 * Auth: `Authorization: Api-Key <hf-api-key>` via `sdk.auth.apiKeyAuth`.
 * Writes: optional `X-Claim-Admin-Code` (HttpClient.claimAdminCode).
 */

export const EMR_BASE_PATH = "/emr-developer-api";

export {
  FhirListParams,
  ClaimListFilters,
  EncounterListFilters,
  PreauthorizationListFilters,
  ClaimLineListFilters,
  PatientReferenceListFilters,
  SubmitOperationResponse,
  buildQuery,
  asFhirBundle,
  asFhirResource,
} from "../healthfacility/types";
