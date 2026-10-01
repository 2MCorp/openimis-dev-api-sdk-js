import { EnrollmentListResult, EnrollmentRecord } from "./types";

/** openimis-be-enrollment `BaseEnrollmentModel` states. */
export const ENROLLMENT_STATUSES = [
  "DRAFT",
  "PENDING",
  "IN_REVIEW",
  "APPROVED",
  "REJECTED",
  "CANCELLED",
  "EXPIRED",
] as const;

export type EnrollmentStatus = (typeof ENROLLMENT_STATUSES)[number];

/** Submissions still awaiting a decision — a new one should not be started meanwhile. */
export const OPEN_ENROLLMENT_STATUSES: readonly EnrollmentStatus[] = ["DRAFT", "PENDING", "IN_REVIEW"];

export function isOpenEnrollmentStatus(status: string | undefined | null): boolean {
  return OPEN_ENROLLMENT_STATUSES.includes(String(status ?? "").toUpperCase() as EnrollmentStatus);
}

import type { FieldError } from "../utils/field_error";

export type { FieldError };

export type EnrollmentSubmissionKind = "registration" | "account_claim";

/** One registration or account-claim submission of the signed-in applicant. */
export type EnrollmentSubmission = {
  uuid: string;
  status: string;
  kind: EnrollmentSubmissionKind;
  /** Entity code the submission is about (facility / policy-holder code). */
  code?: string;
  /** Display name when known (registrations only). */
  name?: string;
  dateCreated?: string;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function text(value: unknown): string | undefined {
  const s = value == null ? "" : String(value).trim();
  return s || undefined;
}

/**
 * Normalise list results into submissions. `dataKey` is the payload field
 * (`policyholder_data`, `facility_data`, `claim_data`); `codeKeys` / `nameKeys`
 * are tried in order inside it.
 */
export function toEnrollmentSubmissions(
  list: EnrollmentListResult | null | undefined,
  kind: EnrollmentSubmissionKind,
  dataKey: string,
  codeKeys: readonly string[],
  nameKeys: readonly string[] = []
): EnrollmentSubmission[] {
  return (list?.results ?? []).map((record: EnrollmentRecord) => {
    const raw = record.raw;
    const payload = asRecord(raw[dataKey]);
    return {
      uuid: record.uuid,
      status: record.status || "UNKNOWN",
      kind,
      code: codeKeys.map((k) => text(payload[k])).find(Boolean),
      name: nameKeys.map((k) => text(payload[k])).find(Boolean),
      dateCreated: text(raw.date_created),
    };
  });
}

/** openimis-be-enrollment `PolicyholderType`. */
export const POLICY_HOLDER_TYPES = ["CORPORATE", "GOVERNMENT", "NGO", "INDIVIDUAL"] as const;
export type PolicyHolderType = (typeof POLICY_HOLDER_TYPES)[number];

/** Registration requires a registration number for these types. */
export const POLICY_HOLDER_TYPES_REQUIRING_REGISTRATION: readonly PolicyHolderType[] = [
  "CORPORATE",
  "GOVERNMENT",
];

/** `policyholder_data` for self-registration (keys as read by the enrollment service). */
export type PolicyHolderRegistrationData = {
  policyholder_code: string;
  policyholder_name: string;
  policyholder_type?: PolicyHolderType | string;
  registration_number?: string;
  contact_person?: string;
  contact_email?: string;
  contact_phone?: string;
  address?: string;
  /** District location id (`locations_id` / `location_id`). */
  location_id?: string | number;
  expected_members?: number;
};

const PH_CODE = /^[A-Za-z0-9]{3,50}$/;
const EMAIL = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

/** Same rules as `PolicyholderEnrollmentService.validate_payload(strict=True)`. */
export function validatePolicyHolderRegistration(data: PolicyHolderRegistrationData): FieldError[] {
  const errors: FieldError[] = [];
  const code = data.policyholder_code?.trim() ?? "";
  if (!code) errors.push({ field: "policyholder_code", message: "Policyholder code is required" });
  else if (!PH_CODE.test(code)) {
    errors.push({
      field: "policyholder_code",
      message: "Policyholder code must be 3-50 alphanumeric characters",
    });
  }
  if (!data.policyholder_name?.trim()) {
    errors.push({ field: "policyholder_name", message: "Policyholder name is required" });
  }
  const email = data.contact_email?.trim();
  if (email && !EMAIL.test(email)) {
    errors.push({ field: "contact_email", message: "Invalid email format" });
  }
  if (
    data.expected_members != null &&
    (!Number.isInteger(data.expected_members) || data.expected_members < 1)
  ) {
    errors.push({ field: "expected_members", message: "Expected members must be a positive integer" });
  }
  const type = data.policyholder_type?.trim();
  if (type && !(POLICY_HOLDER_TYPES as readonly string[]).includes(type)) {
    errors.push({
      field: "policyholder_type",
      message: `Invalid policyholder type. Must be one of: ${POLICY_HOLDER_TYPES.join(", ")}`,
    });
  }
  if (
    type &&
    (POLICY_HOLDER_TYPES_REQUIRING_REGISTRATION as readonly string[]).includes(type) &&
    !data.registration_number?.trim()
  ) {
    errors.push({
      field: "registration_number",
      message: "Registration number is required for corporate and government policyholders",
    });
  }
  return errors;
}

/** Drop empty optional values so the backend only stores what the applicant filled in. */
export function compactPayload<T extends Record<string, unknown>>(data: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(data).filter(
      ([, value]) => value !== undefined && value !== null && !(typeof value === "string" && value.trim() === "")
    )
  ) as Partial<T>;
}

export type PolicyHolderAccountClaimInput = {
  policyholder_code: string;
  contact_name?: string;
  contact_email?: string;
  notes?: string;
};

export function validatePolicyHolderAccountClaim(input: PolicyHolderAccountClaimInput): FieldError[] {
  const errors: FieldError[] = [];
  if (!input.policyholder_code?.trim()) {
    errors.push({ field: "policyholder_code", message: "policyholder_code is required" });
  }
  const email = input.contact_email?.trim();
  if (email && !EMAIL.test(email)) {
    errors.push({ field: "contact_email", message: "Invalid email format" });
  }
  return errors;
}
