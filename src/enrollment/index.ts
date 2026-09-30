import HttpClient from "../types";
import EnrollmentHealthFacilityClient from "./health_facility";
import EnrollmentPolicyHolderClient from "./policy_holder";
import EnrollmentMetadataClient from "./metadata";

/**
 * Client for `/enrollment/` plugin endpoints
 * (relative to HttpClient baseURL `…/developer_api`).
 */
class EnrollmentDevAPIClient {
  public readonly healthFacility: EnrollmentHealthFacilityClient;
  public readonly policyHolder: EnrollmentPolicyHolderClient;
  public readonly metadata: EnrollmentMetadataClient;

  constructor(httpClient: HttpClient) {
    this.healthFacility = new EnrollmentHealthFacilityClient(httpClient);
    this.policyHolder = new EnrollmentPolicyHolderClient(httpClient);
    this.metadata = new EnrollmentMetadataClient(httpClient);
  }
}

export default EnrollmentDevAPIClient;
export {
  EnrollmentHealthFacilityClient,
  EnrollmentPolicyHolderClient,
  EnrollmentMetadataClient,
};
export * from "./types";
