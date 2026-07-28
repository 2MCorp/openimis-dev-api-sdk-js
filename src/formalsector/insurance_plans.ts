/// <reference types="fhir" />

import HttpClient, { ApiResponse, mapData } from "../types";
import EmployeeInsurancePlanFhirConverter from "../fhir_converter/insurance_plan";
import { EmployeeInsurancePlanModel } from "../models/insurance_plan";
import { FhirSearchPage } from "../models/pagination";
import {
  InsurancePlanListFilters,
  PH_BASE_PATH,
  asFhirBundle,
  asFhirResource,
  buildQuery,
} from "./types";

class FormalSectorInsurancePlansClient {
  private readonly converter = new EmployeeInsurancePlanFhirConverter();

  constructor(private readonly httpClient: HttpClient) {}

  async list(
    filters: InsurancePlanListFilters = new InsurancePlanListFilters()
  ): Promise<ApiResponse<FhirSearchPage<EmployeeInsurancePlanModel>>> {
    const response = await this.httpClient.get<unknown>(
      `${PH_BASE_PATH}/insurance-plans/${buildQuery(filters.toQuery())}`
    );
    return mapData(response, (data) =>
      this.converter.fromSearchBundle(asFhirBundle(data))
    );
  }

  async get(pk: string): Promise<ApiResponse<EmployeeInsurancePlanModel>> {
    const response = await this.httpClient.get<unknown>(
      `${PH_BASE_PATH}/insurance-plans/${encodeURIComponent(pk)}/`
    );
    return mapData(response, (data) =>
      this.converter.fromFhir(asFhirResource<fhir4.InsurancePlan>(data))
    );
  }
}

export default FormalSectorInsurancePlansClient;
