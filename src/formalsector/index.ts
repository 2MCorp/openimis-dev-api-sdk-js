import HttpClient from "../types";
import FormalSectorSearchEmployeesClient from "./search_employees";
import FormalSectorEmployeesClient from "./employees";
import FormalSectorGroupsClient from "./groups";
import FormalSectorContractsClient from "./contracts";
import FormalSectorInsurancePlansClient from "./insurance_plans";
import FormalSectorPaymentsClient from "./payments";
import FormalSectorStaffsClient from "./staffs";
import FormalSectorEmployeeClaimsClient from "./employee_claims";

/**
 * Client for `/policy-holder-dev-api/` plugin endpoints.
 * Multi-org users should set HttpClient PolicyHolder-Code before calling.
 */
class FormalSectorDevAPIClient {
  public readonly searchEmployees: FormalSectorSearchEmployeesClient;
  public readonly employees: FormalSectorEmployeesClient;
  public readonly groups: FormalSectorGroupsClient;
  public readonly contracts: FormalSectorContractsClient;
  public readonly insurancePlans: FormalSectorInsurancePlansClient;
  public readonly payments: FormalSectorPaymentsClient;
  public readonly staffs: FormalSectorStaffsClient;
  public readonly employeeClaims: FormalSectorEmployeeClaimsClient;

  constructor(httpClient: HttpClient) {
    this.searchEmployees = new FormalSectorSearchEmployeesClient(httpClient);
    this.employees = new FormalSectorEmployeesClient(httpClient);
    this.groups = new FormalSectorGroupsClient(httpClient);
    this.contracts = new FormalSectorContractsClient(httpClient);
    this.insurancePlans = new FormalSectorInsurancePlansClient(httpClient);
    this.payments = new FormalSectorPaymentsClient(httpClient);
    this.staffs = new FormalSectorStaffsClient(httpClient);
    this.employeeClaims = new FormalSectorEmployeeClaimsClient(httpClient);
  }
}

export default FormalSectorDevAPIClient;
export {
  FormalSectorSearchEmployeesClient,
  FormalSectorEmployeesClient,
  FormalSectorGroupsClient,
  FormalSectorContractsClient,
  FormalSectorInsurancePlansClient,
  FormalSectorPaymentsClient,
  FormalSectorStaffsClient,
  FormalSectorEmployeeClaimsClient,
};
export * from "./types";
