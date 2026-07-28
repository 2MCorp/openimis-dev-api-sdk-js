import HttpClient from "../types";
import { HealthFacilityApiKeyCredentials } from "./types";

/**
 * Credential binder for Health Facility API keys.
 *
 * Used by the EMR Developer API (`Authorization: Api-Key …`).
 * There is no login endpoint — keys are issued via manage.py /
 * systems plugin and bound onto the shared HttpClient here.
 */
class HealthFacilityApiKeyAuthClient {
  constructor(private readonly httpClient: HttpClient) {}

  /**
   * Persist an Api-Key on the HttpClient (and optional claim-admin code).
   */
  useApiKey(credentials: HealthFacilityApiKeyCredentials): void {
    this.httpClient.setAuthScheme("Api-Key");
    this.httpClient.setToken(credentials.apiKey);
    if (credentials.claimAdminCode !== undefined) {
      this.httpClient.setClaimAdminCode(credentials.claimAdminCode);
    }
  }

  setClaimAdminCode(claimAdminCode: string | undefined): void {
    this.httpClient.setClaimAdminCode(claimAdminCode);
  }

  getClaimAdminCode(): string | undefined {
    return this.httpClient.getClaimAdminCode();
  }

  /** Clear Api-Key token and claim-admin header from the HttpClient. */
  clear(): void {
    this.httpClient.setToken(undefined);
    this.httpClient.setClaimAdminCode(undefined);
  }

  isConfigured(): boolean {
    return (
      this.httpClient.getAuthScheme() === "Api-Key" &&
      !!this.httpClient.getToken()
    );
  }
}

export default HealthFacilityApiKeyAuthClient;
