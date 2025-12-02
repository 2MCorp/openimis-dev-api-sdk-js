
import {
  PatientFhirConverter,
} from "./converters/patientConverter";
import { HTTPClient } from "./httpClient";
import {
  SDKConfig,
  APIResponse,
  PaginatedResponse,
  PolicyHolderSearchParams,
} from "./types";
import { ValidationError, SDKError } from "./errors";
import { EmployeeFhirConverter } from "./converters/employeeConverter";
import { EmployeeModel } from "./models/employee";
import { PatientModel } from "./models/patient";

interface PolicyHolderSearchResult {
  employees: EmployeeModel[];
  patients: PatientModel[];
  total: number;
}

interface FHIRBundle {
  resourceType: "Bundle";
  type: "searchset" | "collection";
  total?: number;
  entry?: Array<{
    resource: any;
    fullUrl?: string;
  }>;
}

export class PolicyHolderSDK {
  private httpClient: HTTPClient;
  private readonly employeeConverter = new EmployeeFhirConverter();
  private readonly patientConverter = new PatientFhirConverter();

  constructor(config: SDKConfig & { authToken?: string }) {
    this.httpClient = new HTTPClient(config);

    if (config.authToken) {
      this.httpClient.setAuthToken(config.authToken);
    }
  }

  setAuthToken(token: string): void {
    if (!token?.trim()) {
      throw new ValidationError("Authentication token cannot be empty");
    }
    this.httpClient.setAuthToken(token);
  }

  async searchEmployee(
    chfId: string,
  ): Promise<APIResponse<EmployeeModel | null>> {
    try {
      this.validateChfId(chfId);

      const response = await this.httpClient.get(
        `/search-employee/?identifier=${encodeURIComponent(chfId)}`,
      );

      const bundle = response.data as FHIRBundle;

      if (!this.isValidBundle(bundle)) {
        throw new ValidationError("Invalid FHIR Bundle response received");
      }

      const employee = this.extractEmployeeFromBundle(bundle);

      return {
        success: true,
        message: employee ? "Employee found successfully" : "No employee found",
        data: employee,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      if (error instanceof SDKError) {
        throw error;
      }

      throw new ValidationError(
        "Failed to search employee",
        { chfId },
        error as Error,
      );
    }
  }

  async searchPatient(
    chfId: string,
  ): Promise<APIResponse<PatientModel | null>> {
    try {
      this.validateChfId(chfId);

      const response = await this.httpClient.get(
        `/Patient?identifier=${encodeURIComponent(chfId)}`,
      );

      const bundle = response.data as FHIRBundle;

      if (!this.isValidBundle(bundle)) {
        throw new ValidationError("Invalid FHIR Bundle response received");
      }

      const patient = this.extractPatientFromBundle(bundle);

      return {
        success: true,
        message: patient ? "Patient found successfully" : "No patient found",
        data: patient,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      if (error instanceof SDKError) {
        throw error;
      }

      throw new ValidationError(
        "Failed to search patient",
        { chfId },
        error as Error,
      );
    }
  }

  async searchPolicyHolders(
    params: PolicyHolderSearchParams,
  ): Promise<PaginatedResponse<PolicyHolderSearchResult>> {
    try {
      this.validateSearchParams(params);

      const queryParams = new URLSearchParams();

      if (params.chfId) {
        queryParams.append("identifier", params.chfId);
      }

      if (params.name) {
        queryParams.append("name", params.name);
      }

      if (params.limit) {
        queryParams.append("_count", params.limit.toString());
      }

      if (params.offset) {
        queryParams.append("_offset", params.offset.toString());
      }

      const response = await this.httpClient.get(
        `/Patient?${queryParams.toString()}`,
      );

      const bundle = response.data as FHIRBundle;

      if (!this.isValidBundle(bundle)) {
        throw new ValidationError("Invalid FHIR Bundle response received");
      }

      const employees: EmployeeModel[] = [];
      const patients: PatientModel[] = [];

      bundle.entry?.forEach((entry) => {
        try {
          const employee = this.employeeConverter.fromFhir(entry.resource);
          employees.push(employee);
        } catch {
          try {
            const patient = this.patientConverter.fromFhir(entry.resource);
            patients.push(patient);
          } catch (conversionError) {
            console.warn("Failed to convert FHIR entry:", conversionError);
          }
        }
      });

      const result: PolicyHolderSearchResult = {
        employees,
        patients,
        total: employees.length + patients.length,
      };

      return {
        success: true,
        message: "Search completed successfully",
        data: [result],
        pagination: {
          page: Math.floor((params.offset || 0) / (params.limit || 10)) + 1,
          limit: params.limit || 10,
          total: bundle.total || result.total,
          totalPages: Math.ceil(
            (bundle.total || result.total) / (params.limit || 10),
          ),
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      if (error instanceof SDKError) {
        throw error;
      }

      throw new ValidationError(
        "Failed to search policy holders",
        { params },
        error as Error,
      );
    }
  }

  private validateChfId(chfId: string): void {
    if (!chfId?.trim()) {
      throw new ValidationError("CHF ID is required");
    }

    if (chfId.length < 2) {
      throw new ValidationError("CHF ID must be at least 2 characters long");
    }
  }

  private validateSearchParams(params: PolicyHolderSearchParams): void {
    if (!params.chfId && !params.name) {
      throw new ValidationError(
        "Either CHF ID or name must be provided for search",
      );
    }

    if (params.limit && (params.limit < 1 || params.limit > 100)) {
      throw new ValidationError("Limit must be between 1 and 100");
    }

    if (params.offset && params.offset < 0) {
      throw new ValidationError("Offset must be non-negative");
    }
  }

  private isValidBundle(bundle: any): bundle is FHIRBundle {
    return (
      bundle && bundle.resourceType === "Bundle" && Array.isArray(bundle.entry)
    );
  }

  private extractEmployeeFromBundle(bundle: FHIRBundle): EmployeeModel | null {
    if (!bundle.entry || bundle.entry.length === 0) {
      return null;
    }

    try {
      const employeeData = bundle.entry[0].resource;
      return this.employeeConverter.fromFhir(employeeData);
    } catch {
      return null;
    }
  }

  private extractPatientFromBundle(bundle: FHIRBundle): PatientModel | null {
    if (!bundle.entry || bundle.entry.length === 0) {
      return null;
    }

    try {
      const patientData = bundle.entry[0].resource;
      return this.patientConverter.fromFhir(patientData);
    } catch {
      return null;
    }
  }
}

export default PolicyHolderSDK;
