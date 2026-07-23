import HttpClient from "../types";
import InsureeUserAuthAPIClient from "./insuree_user_auth";

class AuthAPIClient {
  public readonly insureeAuth: InsureeUserAuthAPIClient;
  constructor(private readonly httpClient: HttpClient) {
    this.insureeAuth = new InsureeUserAuthAPIClient(httpClient);
  }
}

export default AuthAPIClient;
