import AuthAPIClient from "./auth";
import FormalSectorDevAPIClient from "./formalsector";
import HealthFacilityDevAPIClient from "./healthfacility";
import HttpClient from "./types";

class OpenIMISDevApiSdk {
  public readonly auth: AuthAPIClient;
  public readonly healthFacility: HealthFacilityDevAPIClient;
  public readonly formalSector: FormalSectorDevAPIClient;

  constructor(httpClient: HttpClient) {
    this.auth = new AuthAPIClient(httpClient);
    this.healthFacility = new HealthFacilityDevAPIClient(httpClient);
    this.formalSector = new FormalSectorDevAPIClient(httpClient);
  }
}

export default OpenIMISDevApiSdk;
