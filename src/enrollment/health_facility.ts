import HttpClient, { ApiResponse, mapData } from "../types";
import {
  ENROLLMENT_BASE_PATH,
  EnrollmentActionResult,
  EnrollmentListResult,
  EnrollmentRecord,
  HealthFacilityAccountClaimPayload,
  HealthFacilityRegistrationPayload,
} from "./types";

const HF_REGISTRATION_PATH = `${ENROLLMENT_BASE_PATH}/health-facility/registration`;
const HF_ACCOUNT_CLAIM_PATH = `${ENROLLMENT_BASE_PATH}/health-facility/account-claim`;

class EnrollmentHealthFacilityClient {
  constructor(private readonly httpClient: HttpClient) {}

  /** POST /enrollment/health-facility/registration/ */
  async register(
    payload: HealthFacilityRegistrationPayload
  ): Promise<ApiResponse<EnrollmentRecord>> {
    const response = await this.httpClient.post<Record<string, unknown>>(
      `${HF_REGISTRATION_PATH}/`,
      payload
    );
    return mapData(response, (data) =>
      EnrollmentRecord.fromJSON(data as Record<string, unknown>)
    );
  }

  /** GET /enrollment/health-facility/registration/ */
  async listRegistrations(): Promise<ApiResponse<EnrollmentListResult>> {
    const response = await this.httpClient.get<unknown>(
      `${HF_REGISTRATION_PATH}/`
    );
    return mapData(response, (data) => EnrollmentListResult.fromJSON(data));
  }

  /** POST /enrollment/health-facility/registration/{uuid}/submit/ */
  async submit(uuid: string): Promise<ApiResponse<EnrollmentActionResult>> {
    const response = await this.httpClient.post<unknown>(
      `${HF_REGISTRATION_PATH}/${encodeURIComponent(uuid)}/submit/`
    );
    return mapData(response, (data) => EnrollmentActionResult.fromJSON(data));
  }

  /** POST /enrollment/health-facility/account-claim/ */
  async accountClaim(
    payload: HealthFacilityAccountClaimPayload
  ): Promise<ApiResponse<EnrollmentActionResult>> {
    const response = await this.httpClient.post<unknown>(
      `${HF_ACCOUNT_CLAIM_PATH}/`,
      payload
    );
    return mapData(response, (data) => EnrollmentActionResult.fromJSON(data));
  }

  /** GET /enrollment/health-facility/account-claim/ */
  async listAccountClaims(): Promise<ApiResponse<EnrollmentListResult>> {
    const response = await this.httpClient.get<unknown>(
      `${HF_ACCOUNT_CLAIM_PATH}/`
    );
    return mapData(response, (data) => EnrollmentListResult.fromJSON(data));
  }
}

export default EnrollmentHealthFacilityClient;
