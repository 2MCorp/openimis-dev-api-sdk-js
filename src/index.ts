/**
 * Developer API FHIR Client SDK
 * 
 * A comprehensive TypeScript SDK for interacting with OpenIMIS Developer API FHIR endpoints.
 * Provides authentication, patient/employee management, and policy holder operations.
 */

// Core types and interfaces
export * from './types';
export * from './errors';

// HTTP Client
export { HTTPClient } from './http-client';

// Authentication
export { default as UserAuthDeveloperAPISDK } from './auth/userAuth';
import UserAuthDeveloperAPISDK from './auth/userAuth';

// Policy Holder operations
export {
    PolicyHolderSDK
} from './policyHolder';
import { PolicyHolderSDK } from './policyHolder';

// Converters and Models
export {
    BaseFhirConverter,
    type FHIRConverter
} from './converters/base';

export {
    AddressModel,
    AddressFhirConverter
} from './converters/address';

export {
    PatientModel,
    PatientFhirConverter
} from './converters/patientConverter';

export {
    EmployeeModel,
    EmployeeFhirConverter
} from './converters/employeeConverter';

// Legacy exports for backward compatibility
export { default as PolicyHolderDevFhirSDK } from './policyHolder';

// Utility functions
export {
    type SdkResponse,
    type FetchError,
    postReq,
    getReq
} from './utls';

/**
 * Main SDK Configuration Interface
 */
export interface DeveloperAPISDKConfig {
    baseUrl: string;
    timeout?: number;
    retries?: number;
    apiVersion?: string;
}

/**
 * Main SDK Class
 * 
 * Provides a unified interface to all SDK functionality.
 */
export class DeveloperAPISDK {
    public readonly config: DeveloperAPISDKConfig;
    public readonly auth: UserAuthDeveloperAPISDK;
    public readonly policyHolder: PolicyHolderSDK;

    constructor(config: DeveloperAPISDKConfig) {
        this.config = config;

        // Initialize modules
        this.auth = new UserAuthDeveloperAPISDK(config.baseUrl);
        this.policyHolder = new PolicyHolderSDK(config);
    }

    /**
     * Set authentication token for all modules
     */
    setAuthToken(token: string): void {
        this.policyHolder.setAuthToken(token);
    }

    /**
     * Get SDK version information
     */
    static getVersion(): string {
        return '1.0.0';
    }

    /**
     * Get SDK information
     */
    static getInfo(): {
        name: string;
        version: string;
        description: string;
        author: string;
    } {
        return {
            name: 'developer_api_fhir_client',
            version: DeveloperAPISDK.getVersion(),
            description: 'A comprehensive TypeScript SDK for OpenIMIS Developer API FHIR endpoints',
            author: '2MCorp'
        };
    }
}

// Default export
export default DeveloperAPISDK;

// Named exports for common usage patterns
export {
    UserAuthDeveloperAPISDK as AuthSDK
};
