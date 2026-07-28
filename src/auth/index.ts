import HttpClient from "../types";
import HealthFacilityApiKeyAuthClient from "./api_key_auth";
import InsureeUserAuthAPIClient from "./insuree_user_auth";
import UserAuthAPIClient from "./user_auth";

class AuthAPIClient {
  public readonly userAuth: UserAuthAPIClient;
  public readonly insureeAuth: InsureeUserAuthAPIClient;
  /** Health Facility Api-Key binder (EMR + other Api-Key consumers). */
  public readonly apiKeyAuth: HealthFacilityApiKeyAuthClient;

  constructor(httpClient: HttpClient) {
    this.userAuth = new UserAuthAPIClient(httpClient);
    this.insureeAuth = new InsureeUserAuthAPIClient(httpClient);
    this.apiKeyAuth = new HealthFacilityApiKeyAuthClient(httpClient);
  }
}

export default AuthAPIClient;
export {
  UserAuthAPIClient,
  InsureeUserAuthAPIClient,
  HealthFacilityApiKeyAuthClient,
};
export * from "./types";
