/// <reference types="fhir" />

import HttpClient, { ApiResponse, mapData } from "../types";
import { EmployeeGroupFhirConverter } from "../fhir_converter/group";
import { EmployeeGroupModel } from "../models/group";
import {
  PH_BASE_PATH,
  asFhirResource,
  buildQuery,
} from "./types";

class FormalSectorGroupsClient {
  private readonly converter = new EmployeeGroupFhirConverter();

  constructor(private readonly httpClient: HttpClient) {}

  /**
   * GET groups/?_employee_uuid={uuid}
   * Returns null when the employee has no family / is unknown.
   */
  async getByEmployeeUuid(
    employeeUuid: string
  ): Promise<ApiResponse<EmployeeGroupModel | null>> {
    const response = await this.httpClient.get<unknown>(
      `${PH_BASE_PATH}/groups/${buildQuery({
        _employee_uuid: employeeUuid,
      })}`
    );

    return mapData(response, (data) => {
      if (data == null) return null;
      return this.converter.fromFhir(asFhirResource<fhir4.Group>(data));
    });
  }
}

export default FormalSectorGroupsClient;
