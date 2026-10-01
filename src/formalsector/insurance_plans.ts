/// <reference types="fhir" />

import HttpClient, { ApiResponse, mapData } from "../types";
import EmployeeInsurancePlanFhirConverter from "../fhir_converter/insurance_plan";
import {
  EmployeeInsurancePlanModel,
  dedupeInsurancePlans,
} from "../models/insurance_plan";
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

  /**
   * All health packages available to the employer, one per bundle.
   * Packages are few per employer, so a single large page is fetched.
   */
  async listPackages(
    code?: string,
    pageSize = 200
  ): Promise<ApiResponse<EmployeeInsurancePlanModel[]>> {
    const resp = await this.list(new InsurancePlanListFilters(undefined, pageSize, code));
    return mapData(resp, (page) =>
      dedupeInsurancePlans((page as FhirSearchPage<EmployeeInsurancePlanModel>).items)
    );
  }

  /** Packages an employee can be enrolled on (they carry a PolicyHolderContributionPlan id). */
  async listEnrollablePackages(): Promise<ApiResponse<EmployeeInsurancePlanModel[]>> {
    const resp = await this.listPackages();
    return mapData(resp, (plans) =>
      (plans as EmployeeInsurancePlanModel[]).filter((p) => !!p.policyHolderContributionPlanId)
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
