import HttpClient, { ApiResponse, mapData } from "../types";
import {
  ENROLLMENT_BASE_PATH,
  EnrollmentActionResult,
  EnrollmentListResult,
  EnrollmentRecord,
  PolicyHolderAccountClaimPayload,
  PolicyHolderRegistrationPayload,
} from "./types";
import {
  EnrollmentSubmission,
  PolicyHolderAccountClaimInput,
  PolicyHolderRegistrationData,
  compactPayload,
  isOpenEnrollmentStatus,
  toEnrollmentSubmissions,
  validatePolicyHolderAccountClaim,
  validatePolicyHolderRegistration,
} from "./enrollment_ops";

const PH_REGISTRATION_PATH = `${ENROLLMENT_BASE_PATH}/policy-holder-registration`;
const PH_ACCOUNT_CLAIM_PATH = `${PH_REGISTRATION_PATH}/account-claim`;

class EnrollmentPolicyHolderClient {
  constructor(private readonly httpClient: HttpClient) {}

  /** POST /enrollment/policy-holder-registration/ */
  async register(
    payload: PolicyHolderRegistrationPayload,
  ): Promise<ApiResponse<EnrollmentRecord>> {
    const response = await this.httpClient.post<Record<string, unknown>>(
      `${PH_REGISTRATION_PATH}/`,
      payload,
    );
    return mapData(response, (data) =>
      EnrollmentRecord.fromJSON(data as Record<string, unknown>),
    );
  }

  /** GET /enrollment/policy-holder-registration/ */
  async listRegistrations(): Promise<ApiResponse<EnrollmentListResult>> {
    const response = await this.httpClient.get<unknown>(
      `${PH_REGISTRATION_PATH}/`,
    );
    return mapData(response, (data) => EnrollmentListResult.fromJSON(data));
  }

  /** POST /enrollment/policy-holder-registration/{uuid}/submit/ */
  async submit(uuid: string): Promise<ApiResponse<EnrollmentActionResult>> {
    const response = await this.httpClient.post<unknown>(
      `${PH_REGISTRATION_PATH}/${encodeURIComponent(uuid)}/submit/`,
    );
    return mapData(response, (data) => EnrollmentActionResult.fromJSON(data));
  }

  /** POST /enrollment/policy-holder-registration/account-claim/ */
  async accountClaim(
    payload: PolicyHolderAccountClaimPayload,
  ): Promise<ApiResponse<EnrollmentActionResult>> {
    const response = await this.httpClient.post<unknown>(
      `${PH_ACCOUNT_CLAIM_PATH}/`,
      payload,
    );
    return mapData(response, (data) => EnrollmentActionResult.fromJSON(data));
  }

  /** GET /enrollment/policy-holder-registration/account-claim/ */
  async listAccountClaims(): Promise<ApiResponse<EnrollmentListResult>> {
    const response = await this.httpClient.get<unknown>(
      `${PH_ACCOUNT_CLAIM_PATH}/`,
    );
    return mapData(response, (data) => EnrollmentListResult.fromJSON(data));
  }

  /** The applicant's registrations and account claims, newest first as returned. */
  async listSubmissions(): Promise<ApiResponse<EnrollmentSubmission[]>> {
    const [registrations, claims] = await Promise.all([
      this.listRegistrations(),
      this.listAccountClaims(),
    ]);
    if (!registrations.success) return registrations.asFailure<EnrollmentSubmission[]>();
    return ApiResponse.ok([
      ...toEnrollmentSubmissions(
        registrations.data,
        "registration",
        "policyholder_data",
        ["policyholder_code", "code"],
        ["policyholder_name", "trade_name"]
      ),
      // Account-claim listing is best-effort (older backends mis-route `account-claim/`).
      ...(claims.success
        ? toEnrollmentSubmissions(claims.data, "account_claim", "claim_data", [
            "policyholder_code",
            "code",
          ])
        : []),
    ]);
  }

  /** True while a registration or claim is DRAFT / PENDING / IN_REVIEW. */
  async hasOpenSubmission(): Promise<ApiResponse<boolean>> {
    const resp = await this.listSubmissions();
    if (!resp.success || !resp.data) return resp.asFailure<boolean>();
    return ApiResponse.ok(resp.data.some((s) => isOpenEnrollmentStatus(s.status)));
  }

  /**
   * Validate, create and submit a self-registration (DRAFT → PENDING).
   * If the applicant already has a DRAFT for the same code (e.g. an earlier submit
   * failed), that draft is submitted instead — the backend rejects a second
   * enrollment with the same code.
   */
  async registerAndSubmit(
    data: PolicyHolderRegistrationData
  ): Promise<ApiResponse<EnrollmentActionResult>> {
    const errors = validatePolicyHolderRegistration(data);
    if (errors.length) return ApiResponse.fail("400", errors[0].message, errors);

    const payload = compactPayload({
      ...data,
      policyholder_code: data.policyholder_code.trim(),
      policyholder_name: data.policyholder_name.trim(),
    });

    const existing = await this.listSubmissions();
    const draft = existing.data?.find(
      (s) =>
        s.kind === "registration" &&
        s.status.toUpperCase() === "DRAFT" &&
        s.code?.toLowerCase() === payload.policyholder_code?.toLowerCase()
    );
    if (draft?.uuid) return this.submit(draft.uuid);

    const created = await this.register({
      policyholder_data: payload,
      notes: "",
      submitted_by_type: "SELF",
      self_enrollemnt_type: "POLICYHOLDER",
    });
    if (!created.success || !created.data) return created.asFailure<EnrollmentActionResult>();
    if (!created.data.uuid) {
      return ApiResponse.fail("502", "Registration created but no uuid returned.");
    }
    return this.submit(created.data.uuid);
  }

  /** Validate and submit a claim for an existing employer (auto-submitted to PENDING). */
  async claimAccount(
    input: PolicyHolderAccountClaimInput
  ): Promise<ApiResponse<EnrollmentActionResult>> {
    const errors = validatePolicyHolderAccountClaim(input);
    if (errors.length) return ApiResponse.fail("400", errors[0].message, errors);
    return this.accountClaim({
      policyholder_code: input.policyholder_code.trim(),
      contact_name: input.contact_name?.trim() ?? "",
      contact_email: input.contact_email?.trim() ?? "",
      notes: input.notes?.trim() ?? "",
      auto_submit: true,
    });
  }
}

export default EnrollmentPolicyHolderClient;
