import { HTTPClient } from "../httpClient";
import { SDKConfig } from "../types";


export interface HealthFacilitySearchParams {
    healthFacilityCode?: string;
}

export class HealthFacilitySDK {
    private httpClient: HTTPClient;


    constructor(config: SDKConfig & { authToken?: string }) {
        this.httpClient = new HTTPClient(config);

        if (config.authToken) {
            this.httpClient.setAuthToken(config.authToken);
        }
    }

    async getMedications() {
        const response = await this.httpClient.get('/health-facility/medications/');
        return response.data;
    }

    async getServices() {
        const response = await this.httpClient.get('/health-facility/services/');
        return response.data;
    }

    async getDiagnoses() {
        const response = await this.httpClient.get('/health-facility/diagnoses/');
        return response.data;
    }

    async getClaims() {
        const response = await this.httpClient.get('/health-facility/claims/');
        return response.data;
    }

    async getEncounters() {
        const response = await this.httpClient.get('/health-facility/encounters/');
        return response.data;
    }

    async getClaimOrEncounterItems() {
        const response = await this.httpClient.get('/health-facility/claim-or-encounter-items/');
        return response.data;
    }

    async getClaimOrEncounterItemServices() {
        const response = await this.httpClient.get('/health-facility/claim-or-encounter-item-services/');
        return response.data;
    }

    async getClaimOrEncounterAttachments() {
        const response = await this.httpClient.get('/health-facility/claim-or-encounter-attachments/');
        return response.data;
    }

    async getPreauthorizations() {
        const response = await this.httpClient.get('/health-facility/preauthorizations/');
        return response.data;
    }

    async getHealthFacilityByCode(params: HealthFacilitySearchParams) {
        const queryParams = new URLSearchParams();

        if (params.healthFacilityCode) {
            queryParams.append('health_facility_code', params.healthFacilityCode);
        }

        const response = await this.httpClient.get(
            `/health-facility/?${queryParams.toString()}`
        );
        return response.data;
    }

}