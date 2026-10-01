import HttpClient from "../types";
import FormalSectorSearchEmployeesClient from "./search_employees";
import FormalSectorEmployeesClient from "./employees";
import FormalSectorGroupsClient from "./groups";
import FormalSectorContractsClient from "./contracts";
import FormalSectorInsurancePlansClient from "./insurance_plans";
import FormalSectorPaymentsClient from "./payments";
import FormalSectorStaffsClient from "./staffs";
import FormalSectorEmployeeClaimsClient from "./employee_claims";
import FormalSectorPatientsClient from "./patients";
import { ApiResponse } from "../api_response";
import { EmployeeModel } from "../models/employee";
import { PatientModel } from "../models/patient";
import { EmployeeEnrollmentInput, validateEmployeeEnrollment } from "./employee_ops";

/** Employee record plus the insuree's demographics (null when search-employee fails). */
export type EmployeeProfile = {
  employee: EmployeeModel;
  insuree: PatientModel | null;
};

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
  public readonly patients: FormalSectorPatientsClient;

  constructor(httpClient: HttpClient) {
    this.searchEmployees = new FormalSectorSearchEmployeesClient(httpClient);
    this.employees = new FormalSectorEmployeesClient(httpClient);
    this.groups = new FormalSectorGroupsClient(httpClient);
    this.contracts = new FormalSectorContractsClient(httpClient);
    this.insurancePlans = new FormalSectorInsurancePlansClient(httpClient);
    this.payments = new FormalSectorPaymentsClient(httpClient);
    this.staffs = new FormalSectorStaffsClient(httpClient);
    this.employeeClaims = new FormalSectorEmployeeClaimsClient(httpClient);
    this.patients = new FormalSectorPatientsClient(httpClient);
  }

  /**
   * Enrol an insuree on one of the employer's health packages.
   * `POST employees/` does not check that the package belongs to this employer
   * (batch upload does), so the package is verified against
   * `insurancePlans.listEnrollablePackages()` first.
   */
  async enrollEmployee(input: EmployeeEnrollmentInput): Promise<ApiResponse<EmployeeModel>> {
    const errors = validateEmployeeEnrollment(input);
    if (errors.length) return ApiResponse.fail("400", errors[0].message, errors);

    const packages = await this.insurancePlans.listEnrollablePackages();
    if (!packages.success || !packages.data) return packages.asFailure<EmployeeModel>();
    const planId = input.policyHolderContributionPlanId.trim();
    if (!packages.data.some((p) => p.policyHolderContributionPlanId === planId)) {
      return ApiResponse.fail("400", "The health package is not available to this employer", [
        { field: "policyHolderContributionPlanId", message: "Unknown health package" },
      ]);
    }
    return this.employees.enroll(input);
  }

  /**
   * `employees/{pk}` (PolicyHolderInsuree UUID) + employer-scoped `patients/{chfId}/`.
   * Demographics are best-effort: a failed insuree lookup yields `insuree: null`.
   */
  async getEmployeeProfile(pk: string): Promise<ApiResponse<EmployeeProfile>> {
    const employeeResp = await this.employees.get(pk);
    if (!employeeResp.success || !employeeResp.data) {
      return employeeResp.asFailure<EmployeeProfile>();
    }
    const employee = employeeResp.data;
    const insureeResp = employee.chfId
      ? await this.patients.getByChfId(employee.chfId)
      : null;
    return ApiResponse.ok(
      { employee, insuree: insureeResp?.success ? insureeResp.data : null },
      employeeResp.statusCode
    );
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
  FormalSectorPatientsClient,
};
export * from "./types";
export * from "./employee_ops";
export * from "./contract_ops";
export * from "./contract_states";
export * from "./payment_status";
