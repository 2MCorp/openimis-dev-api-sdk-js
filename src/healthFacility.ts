import { HTTPClient } from "./httpClient";
import {
  SDKConfig,
  APIResponse
} from "./types";
import {
  ValidationError,
  NotFoundError,
  SDKError
} from "./errors";
import {
  PatientFhirConverter
} from "./converters/patientConverter";
import { MedicationModel } from "./models/medication";
import { ServiceModel } from "./models/service";
import { DiagnosisModel } from "./models/diagnosis";
import { ClaimModel } from "./models/claim";
import { HealthFacilityMetric, HealthFacilityMetricModel } from "./models/healthFacilityMetric";
import { PatientModel } from "./models/patient";
import { ClaimFhirConverter } from "./converters/claim";

export interface HealthFacilitySearchParams {
  healthFacilityCode?: string;
}



const BASE_HEALTH_FACILITY_PATH = "health-facility-dev-api";

export class HealthFacilitySDK {
  private httpClient: HTTPClient;
  private readonly patientConverter = new PatientFhirConverter();

  constructor(config: SDKConfig & { authToken?: string }) {
    this.httpClient = new HTTPClient(config);

    if (config.authToken) {
      this.httpClient.setAuthToken(config.authToken);
    }
  }

  /**
   * Set authentication token for requests
   */
  setAuthToken(token: string): void {
    if (!token?.trim()) {
      throw new ValidationError('Authentication token cannot be empty');
    }
    this.httpClient.setAuthToken(token);
  }

  async getPatientReferences(params?: { chfid?: string, includes?: string[] }): Promise<APIResponse<{
    data: PatientModel[];
    total: number;
  } | null>> {
    try {
      let url = `/${BASE_HEALTH_FACILITY_PATH}/patient-references/`;
      if (params?.chfid) {
        url += `?chfid=${encodeURIComponent(params.chfid)}`;
      }

      if (params?.includes && params.includes.length > 0) {
        const includeParams = params.includes.map(inc => `include=${encodeURIComponent(inc)}`).join('&');
        url += params.chfid ? `&${includeParams}` : `?${includeParams}`;
      }
      const response = await this.httpClient.get(url);

      let patients: PatientModel[] = [];
      let total = 0

      if (response.data) {
        const entries = response.data?.entry || [];
        total = response.data?.total || entries.length;
        for (const entry of entries) {
          const patientFhir = entry.resource;
          const patientModel = this.patientConverter.fromFhir(patientFhir);
          patients.push(patientModel);
        }
      }


      return {
        success: true,
        message: 'Patient references retrieved successfully',
        data: patients.length > 0 ? { data: patients, total: total } : null,
        errorDetails: [],
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      const errorMessage = error instanceof SDKError
        ? error.message
        : (error instanceof Error ? error.message : 'Unknown error');
      return {
        success: false,
        message: errorMessage,
        data: null,
        errorDetails: [errorMessage],
        timestamp: new Date().toISOString()
      };

    }

  }

  async getMetrics(): Promise<APIResponse<HealthFacilityMetricModel[]>> {
    try {
      const response = await this.httpClient.get(`/dashboard/metric/health-facility/`);

      const hfMetricModel = new HealthFacilityMetric(response.data as HealthFacilityMetricModel);
      return {
        success: true,
        message: 'Health facility metrics retrieved successfully',
        data: hfMetricModel.toJSON() ? [hfMetricModel.toJSON()] : [],
        timestamp: new Date().toISOString()
      };
    } catch (err) {
      console.error('Error fetching health facility metrics:', err);

      const errorMessage = err instanceof SDKError
        ? err.message
        : (err instanceof Error ? err.message : 'Unknown error');

      return {
        success: false,
        message: errorMessage,
        data: [],
        errorDetails: [errorMessage],
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Get list of available medications
   */
  async getMedications(): Promise<APIResponse<MedicationModel[]>> {
    try {
      const response = await this.httpClient.get(`/${BASE_HEALTH_FACILITY_PATH}/medications/`);

      return {
        success: true,
        message: 'Medications retrieved successfully',
        data: response.data || [],
        errorDetails: [],
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      if (error instanceof SDKError) {
        return {
          success: true,
          message: 'Error retrieving medications',
          data: [],
          errorDetails: [error instanceof Error ? error.message : 'Unknown error'],
          timestamp: new Date().toISOString()
        };
      }

      return {
        success: true,
        message: 'Error retrieving medications',
        data: [],
        errorDetails: [error instanceof Error ? error.message : 'Unknown error'],
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Search for patient by CHF ID
   * @param chfId - Patient's CHF identifier
   * @returns Promise resolving to serializable patient data or null if not found
   */
  async searchPatientByChfId(chfId: string): Promise<APIResponse<PatientModel | null>> {
    try {
      this.validateChfId(chfId);

      const response = await this.httpClient.get(
        `/${BASE_HEALTH_FACILITY_PATH}/search-patient/?identifier=${encodeURIComponent(chfId)}`
      );

      const patientModel = this.patientConverter.fromFhir(response.data);

      return {
        success: true,
        message: patientModel ? 'Patient found successfully' : 'No patient found with the provided CHF ID',
        data: patientModel,
        timestamp: new Date().toISOString()
      };

    } catch (error) {

      if (error instanceof NotFoundError) {
        return {
          success: false,
          message: 'No patient found with the provided CHF ID',
          data: null,
          timestamp: new Date().toISOString()
        };
      }

      if (error instanceof SDKError) {
        return {
          success: false,
          message: 'SDK error occurred while searching for patient',
          data: null,
          timestamp: new Date().toISOString()
        };
      }

      return {
        success: false,
        message: 'Error occurred while searching for patient',
        data: null,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Validate CHF ID format
   */
  private validateChfId(chfId: string): void {
    if (!chfId?.trim()) {
      throw new ValidationError('CHF ID is required');
    }

    if (chfId.length < 2) {
      throw new ValidationError('CHF ID must be at least 2 characters long');
    }
  }

  /**
   * Get list of available services
   */
  async getServices(): Promise<APIResponse<ServiceModel[]>> {
    try {
      const response = await this.httpClient.get(`/${BASE_HEALTH_FACILITY_PATH}/services/`);

      return {
        success: true,
        message: 'Services retrieved successfully',
        data: response.data || [],
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      if (error instanceof SDKError) {
        throw error;
      }

      throw new ValidationError(
        'Failed to retrieve services',
        {},
        error as Error
      );
    }
  }

  /**
   * Get list of available diagnoses
   */
  async getDiagnoses(): Promise<APIResponse<DiagnosisModel[]>> {
    try {
      const response = await this.httpClient.get(`/${BASE_HEALTH_FACILITY_PATH}/diagnoses/`);

      return {
        success: true,
        message: 'Diagnoses retrieved successfully',
        data: response.data || [],
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      if (error instanceof SDKError) {
        throw error;
      }

      throw new ValidationError(
        'Failed to retrieve diagnoses',
        {},
        error as Error
      );
    }
  }

  /**
   * Get list of claims
   */
  async getClaims(): Promise<APIResponse<{ data: ClaimModel[], total?: number }>> {
    try {
      const response = await this.httpClient.get(`/${BASE_HEALTH_FACILITY_PATH}/claims/`);
      const claimConverter = new ClaimFhirConverter();

      const entries = response.data?.entry || [];
      const claims: ClaimModel[] = [];

      for (const entry of entries) {
        try {
          const claimModel = claimConverter.fromFhir(entry.resource);
          claims.push(claimModel);
        } catch (conversionError) {
          console.warn('Failed to convert claim entry:', conversionError);
        }
      }

      return {
        success: true,
        message: 'Claims retrieved successfully',
        data: { data: claims, total: response.data?.total || claims.length },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      const errorMessage = error instanceof SDKError
        ? error.message
        : (error instanceof Error ? error.message : 'Unknown error');

      return {
        success: false,
        message: errorMessage,
        data: { data: [], total: 0 },
        errorDetails: [errorMessage],
        timestamp: new Date().toISOString()
      };
    }
  }

  async getClaimById(claimId: string): Promise<APIResponse<ClaimModel | null>> {
    try {
      if (!claimId?.trim()) {
        return {
          success: false,
          message: 'Claim ID is required',
          data: null,
          errorDetails: ['Claim ID is required'],
          timestamp: new Date().toISOString()
        };
      }

      const response = await this.httpClient.get(
        `/${BASE_HEALTH_FACILITY_PATH}/claims/${encodeURIComponent(claimId)}/`
      );

      const claimConverter = new ClaimFhirConverter();

      // Handle both single resource and bundle response formats
      let claimData = response.data;
      if (response.data?.entry && response.data.entry.length > 0) {
        claimData = response.data.entry[0].resource;
      }

      const claimModel = claimConverter.fromFhir(claimData);

      return {
        success: true,
        message: 'Claim retrieved successfully',
        data: claimModel,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      if (error instanceof NotFoundError) {
        return {
          success: false,
          message: 'No claim found with the provided ID',
          data: null,
          timestamp: new Date().toISOString()
        };
      }

      const errorMessage = error instanceof SDKError
        ? error.message
        : (error instanceof Error ? error.message : 'Unknown error');

      return {
        success: false,
        message: errorMessage,
        data: null,
        errorDetails: [errorMessage],
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Get list of encounters
   */
  async getEncounters(): Promise<APIResponse<ClaimModel[]>> {
    try {
      const response = await this.httpClient.get(`/${BASE_HEALTH_FACILITY_PATH}/encounters/`);

      return {
        success: true,
        message: 'Encounters retrieved successfully',
        data: response.data || [],
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      if (error instanceof SDKError) {
        throw error;
      }

      throw new ValidationError(
        'Failed to retrieve encounters',
        {},
        error as Error
      );
    }
  }

  async getClaimOrEncounterItems() {
    const response = await this.httpClient.get(
      `${BASE_HEALTH_FACILITY_PATH}claim-or-encounter-items/`,
    );
    return response.data;
  }

  async getClaimOrEncounterItemServices() {
    const response = await this.httpClient.get(
      `${BASE_HEALTH_FACILITY_PATH}claim-or-encounter-item-services/`,
    );
    return response.data;
  }

  async getClaimOrEncounterAttachments() {
    const response = await this.httpClient.get(
      `${BASE_HEALTH_FACILITY_PATH}claim-or-encounter-attachments/`,
    );
    return response.data;
  }

  async getPreauthorizations() {
    const response = await this.httpClient.get(
      `${BASE_HEALTH_FACILITY_PATH}preauthorizations/`,
    );
    return response.data;
  }

  /**
   * Get health facility by code
   */
  async getHealthFacilityByCode(params: HealthFacilitySearchParams): Promise<APIResponse<any>> {
    try {
      if (!params.healthFacilityCode?.trim()) {
        throw new ValidationError('Health facility code is required');
      }

      const queryParams = new URLSearchParams();
      queryParams.append("health_facility_code", params.healthFacilityCode);

      const response = await this.httpClient.get(
        `/${BASE_HEALTH_FACILITY_PATH}/?${queryParams.toString()}`
      );

      return {
        success: true,
        message: 'Health facility retrieved successfully',
        data: response.data,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      if (error instanceof NotFoundError) {
        return {
          success: true,
          message: 'No health facility found with the provided code',
          data: null,
          timestamp: new Date().toISOString()
        };
      }

      if (error instanceof SDKError) {
        throw error;
      }

      throw new ValidationError(
        'Failed to retrieve health facility',
        { healthFacilityCode: params.healthFacilityCode },
        error as Error
      );
    }
  }
}
