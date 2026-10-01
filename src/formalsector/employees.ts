/// <reference types="fhir" />

import HttpClient, { ApiResponse, mapData } from "../types";
import EmployeeFhirConverter from "../fhir_converter/employee";
import BinaryFhirConverter from "../fhir_converter/binary";
import { EmployeeModel } from "../models/employee";
import { BinaryModel } from "../models/binary";
import { FhirSearchPage } from "../models/pagination";
import {
  EmployeeBinaryUploadQuery,
  EmployeeListFilters,
  PH_BASE_PATH,
  asFhirBundle,
  asFhirResource,
  buildQuery,
} from "./types";
import {
  EmployeeEnrollmentInput,
  EmployeeUpdateInput,
  EmployeeUploadInput,
  employeeModelForEnrollment,
  employeeUploadContentType,
  validateEmployeeEnrollment,
  validateEmployeeUpdate,
  validateEmployeeUpload,
} from "./employee_ops";

class FormalSectorEmployeesClient {
  private readonly converter = new EmployeeFhirConverter();
  private readonly binaryConverter = new BinaryFhirConverter();

  constructor(private readonly httpClient: HttpClient) {}

  async list(
    filters: EmployeeListFilters = new EmployeeListFilters()
  ): Promise<ApiResponse<FhirSearchPage<EmployeeModel>>> {
    const response = await this.httpClient.get<unknown>(
      `${PH_BASE_PATH}/employees/${buildQuery(filters.toQuery())}`
    );
    return mapData(response, (data) =>
      this.converter.fromSearchBundle(asFhirBundle(data))
    );
  }

  async get(pk: string): Promise<ApiResponse<EmployeeModel>> {
    const response = await this.httpClient.get<unknown>(
      `${PH_BASE_PATH}/employees/${encodeURIComponent(pk)}/`
    );
    return mapData(response, (data) =>
      this.converter.fromFhir(asFhirResource<fhir4.Patient>(data))
    );
  }

  async create(employee: EmployeeModel): Promise<ApiResponse<EmployeeModel>> {
    const response = await this.httpClient.post<unknown>(
      `${PH_BASE_PATH}/employees/`,
      this.converter.toFhir(employee)
    );
    return mapData(response, (data) =>
      this.converter.fromFhir(asFhirResource<fhir4.Patient>(data))
    );
  }

  /**
   * Validate and enrol an existing insuree on a health package.
   * Returns a 400 failure with field errors in `errorDetails` when input is invalid.
   */
  async enroll(input: EmployeeEnrollmentInput): Promise<ApiResponse<EmployeeModel>> {
    const errors = validateEmployeeEnrollment(input);
    if (errors.length) {
      return ApiResponse.fail("400", errors[0].message, errors);
    }
    return this.create(employeeModelForEnrollment(input));
  }

  /**
   * Validate and change an employee's health package and/or income. The backend
   * checks the package belongs to the employer and updates the record in place.
   */
  async update(pk: string, input: EmployeeUpdateInput): Promise<ApiResponse<EmployeeModel>> {
    const errors = validateEmployeeUpdate(input);
    if (errors.length) return ApiResponse.fail("400", errors[0].message, errors);
    const body: Record<string, unknown> = {};
    const planId = input.policyHolderContributionPlanId?.trim();
    if (planId) body.policy_holder_contribution_plan_id = planId;
    if (input.income != null) body.income = input.income;
    const response = await this.httpClient.patch<unknown>(
      `${PH_BASE_PATH}/employees/${encodeURIComponent(pk)}/`,
      body
    );
    return mapData(response, (data) =>
      this.converter.fromFhir(asFhirResource<fhir4.Patient>(data))
    );
  }

  /**
   * Validate and upload a CSV / Excel / JSON file of employees (rows parsed server-side).
   * Row-level backend errors arrive in `errorDetails` — see `describeErrorDetails`.
   */
  async uploadFile(input: EmployeeUploadInput): Promise<ApiResponse<EmployeeModel[]>> {
    const errors = validateEmployeeUpload(input);
    if (errors.length) {
      return ApiResponse.fail("400", errors[0].message, errors);
    }
    return this.uploadBinary(
      new BinaryModel(employeeUploadContentType(input.fileName)!, input.base64),
      new EmployeeBinaryUploadQuery(input.defaultPlanCode || undefined)
    );
  }

  /** POST employees/upload-binary/ → Bundle collection of Patients. */
  async uploadBinary(
    binary: BinaryModel,
    query: EmployeeBinaryUploadQuery = new EmployeeBinaryUploadQuery()
  ): Promise<ApiResponse<EmployeeModel[]>> {
    const response = await this.httpClient.post<unknown>(
      `${PH_BASE_PATH}/employees/upload-binary/${buildQuery(query.toQuery())}`,
      this.binaryConverter.toFhir(binary)
    );
    return mapData(response, (data) =>
      this.converter.fromBundle(asFhirBundle(data))
    );
  }

  /** POST employees/batch-upload/ → Bundle collection of Patients. */
  async batchUpload(employees: EmployeeModel[]): Promise<ApiResponse<EmployeeModel[]>> {
    const bundle = this.converter.toCollectionBundle(employees);
    const response = await this.httpClient.post<unknown>(
      `${PH_BASE_PATH}/employees/batch-upload/`,
      bundle
    );
    return mapData(response, (data) =>
      this.converter.fromBundle(asFhirBundle(data))
    );
  }

  async batchUploadBundle(bundle: fhir4.Bundle): Promise<ApiResponse<EmployeeModel[]>> {
    const response = await this.httpClient.post<unknown>(
      `${PH_BASE_PATH}/employees/batch-upload/`,
      bundle
    );
    return mapData(response, (data) =>
      this.converter.fromBundle(asFhirBundle(data))
    );
  }
}

export default FormalSectorEmployeesClient;
