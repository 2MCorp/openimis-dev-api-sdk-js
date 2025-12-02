/**
 * Developer API FHIR Client SDK
 *
 * A comprehensive TypeScript SDK for interacting with OpenIMIS Developer API FHIR endpoints.
 * Provides authentication, patient/employee management, and policy holder operations.
 */

export * from "./types";
export * from "./errors";

export { HTTPClient } from "./httpClient";

export { default as UserAuthDeveloperAPISDK } from "./auth/userAuth";
import UserAuthDeveloperAPISDK from "./auth/userAuth";
import { HealthFacilitySDK } from "./healthFacility";

export { PolicyHolderSDK } from "./policyHolder";
import { PolicyHolderSDK } from "./policyHolder";

export { BaseFhirConverter, type FHIRConverter } from "./converters/base";

export { PatientModel } from './models/patient';
export {
  PatientFhirConverter,
} from "./converters/patientConverter";


export { default as PolicyHolderDevFhirSDK } from "./policyHolder";

export { type SdkResponse, type FetchError, postReq, getReq } from "./utils";

export interface DeveloperAPISDKConfig {
  baseUrl: string;
  timeout?: number;
  retries?: number;
  apiVersion?: string;
}

export class DeveloperAPISDK {
  public readonly config: DeveloperAPISDKConfig;
  public readonly auth: UserAuthDeveloperAPISDK;
  public readonly policyHolder: PolicyHolderSDK;
  public readonly healthFacility: HealthFacilitySDK;

  constructor(config: DeveloperAPISDKConfig) {
    this.config = config;

    this.auth = new UserAuthDeveloperAPISDK(config.baseUrl);
    this.policyHolder = new PolicyHolderSDK(config);
    this.healthFacility = new HealthFacilitySDK(config);
  }

  setAuthToken(token: string): void {
    this.policyHolder.setAuthToken(token);
  }

  static getVersion(): string {
    return "1.0.0";
  }

  static getInfo(): {
    name: string;
    version: string;
    description: string;
    author: string;
  } {
    return {
      name: "developer_api_fhir_client",
      version: DeveloperAPISDK.getVersion(),
      description:
        "A comprehensive TypeScript SDK for OpenIMIS Developer API FHIR endpoints",
      author: "2MCorp",
    };
  }
}

export default DeveloperAPISDK;

export { UserAuthDeveloperAPISDK as AuthSDK };
