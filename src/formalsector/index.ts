import HttpClient from "../types";
import FormalSectorSearchEmployeesClient from "./search_employees";
import FormalSectorEmployeesClient from "./employees";
import FormalSectorGroupsClient from "./groups";
import FormalSectorContractsClient from "./contracts";
import FormalSectorInsurancePlansClient from "./insurance_plans";
import FormalSectorPaymentsClient from "./payments";
import FormalSectorPaymentGatewayClient from "./payment_gateway";
import FormalSectorStaffsClient from "./staffs";
import FormalSectorEmployeeClaimsClient from "./employee_claims";
import FormalSectorPatientsClient from "./patients";
import { ApiResponse } from "../api_response";
import { EmployeeModel } from "../models/employee";
import { PatientModel } from "../models/patient";
import {
  EmployeeEnrollmentInput,
  EmployeeUpdateInput,
  validateEmployeeEnrollment,
} from "./employee_ops";
import type { CalculationParam } from "./calculation_inputs";

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
  public readonly paymentGateway: FormalSectorPaymentGatewayClient;
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
    this.paymentGateway = new FormalSectorPaymentGatewayClient(httpClient);
    this.staffs = new FormalSectorStaffsClient(httpClient);
    this.employeeClaims = new FormalSectorEmployeeClaimsClient(httpClient);
    this.patients = new FormalSectorPatientsClient(httpClient);
  }

  /**
   * Enrol an insuree on one of the employer's health packages.
   * `POST employees/` does not check that the package belongs to this employer
   * (batch upload does), so the package is verified against
   * `insurancePlans.listEnrollablePackages()` first. Calculation inputs are checked
   * against the package's declared parameters (fetched when not given); the backend
   * validates them again.
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
    const calculationParams =
      input.calculationParams ?? (await this.packageCalculationParams(planId));
    return this.employees.enroll({ ...input, calculationParams });
  }

  /**
   * Change an employee's package and/or calculation inputs; inputs are checked against
   * the parameters of the (new) package, fetched when not given.
   */
  async updateEmployee(pk: string, input: EmployeeUpdateInput): Promise<ApiResponse<EmployeeModel>> {
    let calculationParams = input.calculationParams;
    if (!calculationParams && input.calculationRule != null) {
      const form = await this.employees.calculationParamsFor(pk, input.policyHolderContributionPlanId);
      calculationParams = form.success && form.data ? form.data.parameters : undefined;
    }
    return this.employees.update(pk, { ...input, calculationParams });
  }

  /** Declared inputs of a package, or undefined when the backend cannot say. */
  private async packageCalculationParams(planId: string): Promise<CalculationParam[] | undefined> {
    const form = await this.employees.calculationParams(planId);
    return form.success && form.data ? form.data.parameters : undefined;
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
