/// <reference types="fhir" />

/** Matches developer_api_fhir DEFAULT_CFG / R5 identifier config. */
export const OPENIMIS_IDENTIFIER_SYSTEM =
  "https://openimis.github.io/openimis_fhir_r4_ig/CodeSystem/openimis-identifiers";

export const OPENIMIS_IDENTIFIER_SYSTEM_R5 =
  "https://openimis.github.io/openimis_fhir_r5_ig/CodeSystem/openimis-identifiers";

export const FACILITY_REFERENCE_SYSTEM = "http://example.org/facility-ids";

export const EMPLOYEE_MR_SYSTEM = "http://example.com/fhir/identifier";
export const EMPLOYEE_UUID_SYSTEM =
  "http://example.com/fhir/employee-identifier";
export const INSUREE_UUID_SYSTEM = "http://example.com/fhir/insuree-identifier";
export const INSUREE_NUMBER_SYSTEM =
  "http://example.com/fhir/insuree-number";
export const CONTRIBUTION_PLAN_BUNDLE_SYSTEM =
  "http://example.com/fhir/contribution-plan-bundle";
export const EMPLOYEE_IDENTIFIER_TYPE_SYSTEM =
  "http://example.com/fhir/identifier-type";

export const EMPLOYEE_INCOME_EXTENSION =
  "http://example.com/fhir/StructureDefinition/employee-income";
export const EMPLOYEE_CPB_EXTENSION =
  "http://example.com/fhir/StructureDefinition/contributionPlanBundleId";
export const EMPLOYEE_PHCP_EXTENSION_SUFFIX = "PolicyHolderContributionPlanID";

/** Claim status as emitted by ClaimConverter.to_fhir_obj (UPPERCASE). */
export const CLAIM_STATUS = {
  ENTERED: "ENTERED",
  REJECTED: "REJECTED",
  CHECKED: "CHECKED",
  PROCESSED: "PROCESSED",
  VALUATED: "VALUATED",
  UNKNOWN: "UNKNOWN",
} as const;

export type ClaimStatusCode =
  (typeof CLAIM_STATUS)[keyof typeof CLAIM_STATUS];

/** Visit type codes from ClaimVisitTypeMapping. */
export const CLAIM_VISIT_TYPE = {
  Emergency: "E",
  Referral: "R",
  Other: "O",
  Encounter: "C",
} as const;

export type ClaimVisitTypeCode =
  (typeof CLAIM_VISIT_TYPE)[keyof typeof CLAIM_VISIT_TYPE];
