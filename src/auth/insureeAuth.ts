import { HTTPClient } from "../httpClient";
import { SDKConfig } from "../types";

class InsureeUserAuthDeveloperAPISDK {
  private httpClient: HTTPClient;

  constructor(
    config: SDKConfig & {
      authToken?: string;
    },
  ) {
    this.httpClient = new HTTPClient(config);

    if (config.authToken) {
      this.httpClient.setAuthToken(config.authToken);
    }
  }

  async login(username: String, password: String) {
    const response = await this.httpClient.post("", {
      username: username,
      password: password,
    });

    return response.data;
  }
}

export default InsureeUserAuthDeveloperAPISDK;
