/// <reference types="fhir" />

import HttpClient from "../types";
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

class FormalSectorEmployeesClient {
  private readonly converter = new EmployeeFhirConverter();
  private readonly binaryConverter = new BinaryFhirConverter();

  constructor(private readonly httpClient: HttpClient) {}

  async list(
    filters: EmployeeListFilters = new EmployeeListFilters()
  ): Promise<FhirSearchPage<EmployeeModel>> {
    const data = await this.httpClient.get<unknown>(
      `${PH_BASE_PATH}/employees/${buildQuery(filters.toQuery())}`
    );
    return this.converter.fromSearchBundle(asFhirBundle(data));
  }

  async get(pk: string): Promise<EmployeeModel> {
    const data = await this.httpClient.get<unknown>(
      `${PH_BASE_PATH}/employees/${encodeURIComponent(pk)}/`
    );
    return this.converter.fromFhir(asFhirResource<fhir4.Patient>(data));
  }

  async create(employee: EmployeeModel): Promise<EmployeeModel> {
    const data = await this.httpClient.post<unknown>(
      `${PH_BASE_PATH}/employees/`,
      this.converter.toFhir(employee)
    );
    return this.converter.fromFhir(asFhirResource<fhir4.Patient>(data));
  }

  /** POST employees/upload-binary/ → Bundle collection of Patients. */
  async uploadBinary(
    binary: BinaryModel,
    query: EmployeeBinaryUploadQuery = new EmployeeBinaryUploadQuery()
  ): Promise<EmployeeModel[]> {
    const data = await this.httpClient.post<unknown>(
      `${PH_BASE_PATH}/employees/upload-binary/${buildQuery(query.toQuery())}`,
      this.binaryConverter.toFhir(binary)
    );
    return this.converter.fromBundle(asFhirBundle(data));
  }

  /** POST employees/batch-upload/ → Bundle collection of Patients. */
  async batchUpload(employees: EmployeeModel[]): Promise<EmployeeModel[]> {
    const bundle = this.converter.toCollectionBundle(employees);
    const data = await this.httpClient.post<unknown>(
      `${PH_BASE_PATH}/employees/batch-upload/`,
      bundle
    );
    return this.converter.fromBundle(asFhirBundle(data));
  }

  async batchUploadBundle(bundle: fhir4.Bundle): Promise<EmployeeModel[]> {
    const data = await this.httpClient.post<unknown>(
      `${PH_BASE_PATH}/employees/batch-upload/`,
      bundle
    );
    return this.converter.fromBundle(asFhirBundle(data));
  }
}

export default FormalSectorEmployeesClient;
