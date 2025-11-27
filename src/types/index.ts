/**
 * Core types and interfaces for the Developer API FHIR Client SDK
 */

// Base configuration
export interface SDKConfig {
    baseUrl: string;
    timeout?: number;
    retries?: number;
    apiVersion?: string;
}

// Authentication related types
export interface AuthConfig extends SDKConfig {
    authEndpoint?: string;
}

export interface LoginCredentials {
    username: string;
    password: string;
}

export interface AuthTokens {
    token: string;
    refreshToken?: string;
    expiresAt?: Date;
}

export interface UserInfo {
    id: string;
    username: string;
    email?: string;
    firstName?: string;
    lastName?: string;
    roles?: string[];
}

// API Response types
export interface APIResponse<T = any> {
    success: boolean;
    message: string;
    data?: T;
    errorDetails?: string[];
    timestamp?: string;
}

export interface PaginatedResponse<T> extends APIResponse<T[]> {
    pagination?: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

// HTTP related types
export interface HTTPResponse {
    data: any;
    status: number;
    headers?: Record<string, string>;
}

export interface HTTPError extends Error {
    status?: number;
    response?: {
        data?: any;
        status?: number;
    };
}

// FHIR related types
export interface FHIRIdentifier {
    system?: string;
    value: string;
    use?: 'usual' | 'official' | 'temp' | 'secondary';
}

export interface FHIRName {
    use?: 'usual' | 'official' | 'temp' | 'nickname' | 'anonymous' | 'old' | 'maiden';
    family?: string;
    given?: string[];
    prefix?: string[];
    suffix?: string[];
}

export interface FHIRAddress {
    use?: 'home' | 'work' | 'temp' | 'old' | 'billing';
    type?: 'postal' | 'physical' | 'both';
    line?: string[];
    city?: string;
    district?: string;
    state?: string;
    postalCode?: string;
    country?: string;
}

export interface FHIRPatient {
    id?: string;
    identifier?: FHIRIdentifier[];
    active?: boolean;
    name?: FHIRName[];
    gender?: 'male' | 'female' | 'other' | 'unknown';
    birthDate?: string;
    address?: FHIRAddress[];
    photo?: Array<{
        contentType?: string;
        data?: string;
        url?: string;
    }>;
    extension?: Array<{
        url: string;
        valueDecimal?: number;
        valueString?: string;
        valueBoolean?: boolean;
        valueDateTime?: string;
    }>;
}

// Domain specific types
export interface Patient {
    chfId: string;
    lastName: string;
    otherNames: string;
    gender: string;
    birthDate: string;
    photo?: string;
    addresses?: Address[];
}

export interface Address {
    name: string;
    city: string;
    district: string;
    state: string;
    type?: string;
}

export interface Employee extends Patient {
    income: number;
    currency: string;
}

// Policy holder related types
export interface PolicyHolderSearchParams {
    chfId?: string;
    name?: string;
    limit?: number;
    offset?: number;
}

// Error types
export enum SDKErrorCode {
    NETWORK_ERROR = 'NETWORK_ERROR',
    AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
    AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',
    VALIDATION_ERROR = 'VALIDATION_ERROR',
    NOT_FOUND_ERROR = 'NOT_FOUND_ERROR',
    SERVER_ERROR = 'SERVER_ERROR',
    TIMEOUT_ERROR = 'TIMEOUT_ERROR',
    UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

export interface SDKErrorDetails {
    code: SDKErrorCode;
    message: string;
    details?: any;
    originalError?: Error;
}