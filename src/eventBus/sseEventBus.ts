import { HTTPClient } from "../httpClient";
import { SDKConfig } from "../types";

export class EventBusSDK {
  private httpClient: HTTPClient;

  constructor(config: SDKConfig & { authToken?: string }) {
    this.httpClient = new HTTPClient(config);

    if (config.authToken) {
      this.httpClient.setAuthToken(config.authToken);
    }
  }
}
