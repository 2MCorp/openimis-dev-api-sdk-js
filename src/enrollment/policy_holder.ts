import HttpClient, { ApiResponse, mapData } from "../types";
import {
  ENROLLMENT_BASE_PATH,
  EnrollmentActionResult,
  EnrollmentListResult,
  EnrollmentRecord,
  PolicyHolderAccountClaimPayload,
  PolicyHolderRegistrationPayload,
} from "./types";

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
}

export default EnrollmentPolicyHolderClient;
