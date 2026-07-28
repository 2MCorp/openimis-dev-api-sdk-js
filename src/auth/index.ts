import HttpClient from "../types";
import InsureeUserAuthAPIClient from "./insuree_user_auth";
import UserAuthAPIClient from "./user_auth";

class AuthAPIClient {
  public readonly userAuth: UserAuthAPIClient;
  public readonly insureeAuth: InsureeUserAuthAPIClient;

  constructor(httpClient: HttpClient) {
    this.userAuth = new UserAuthAPIClient(httpClient);
    this.insureeAuth = new InsureeUserAuthAPIClient(httpClient);
  }
}

export default AuthAPIClient;
export { UserAuthAPIClient, InsureeUserAuthAPIClient };
export * from "./types";
