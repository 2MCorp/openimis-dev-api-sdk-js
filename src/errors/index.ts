/**
 * Custom error classes for the Developer API FHIR Client SDK
 */

import { SDKErrorCode, SDKErrorDetails } from '../types';

/**
 * Base SDK Error class
 */
export class SDKError extends Error {
    public readonly code: SDKErrorCode;
    public readonly details?: any;
    public readonly originalError?: Error;
    public readonly timestamp: Date;

    constructor(errorDetails: SDKErrorDetails) {
        super(errorDetails.message);
        this.name = 'SDKError';
        this.code = errorDetails.code;
        this.details = errorDetails.details;
        this.originalError = errorDetails.originalError;
        this.timestamp = new Date();

        // Maintains proper stack trace for where our error was thrown
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, SDKError);
        }
    }

    toJSON() {
        return {
            name: this.name,
            code: this.code,
            message: this.message,
            details: this.details,
            timestamp: this.timestamp.toISOString(),
            stack: this.stack
        };
    }
}

/**
 * Authentication related errors
 */
export class AuthenticationError extends SDKError {
    constructor(message: string, details?: any, originalError?: Error) {
        super({
            code: SDKErrorCode.AUTHENTICATION_ERROR,
            message,
            details,
            originalError
        });
        this.name = 'AuthenticationError';
    }
}

/**
 * Authorization related errors
 */
export class AuthorizationError extends SDKError {
    constructor(message: string, details?: any, originalError?: Error) {
        super({
            code: SDKErrorCode.AUTHORIZATION_ERROR,
            message,
            details,
            originalError
        });
        this.name = 'AuthorizationError';
    }
}

/**
 * Network related errors
 */
export class NetworkError extends SDKError {
    constructor(message: string, details?: any, originalError?: Error) {
        super({
            code: SDKErrorCode.NETWORK_ERROR,
            message,
            details,
            originalError
        });
        this.name = 'NetworkError';
    }
}

/**
 * Validation related errors
 */
export class ValidationError extends SDKError {
    constructor(message: string, details?: any, originalError?: Error) {
        super({
            code: SDKErrorCode.VALIDATION_ERROR,
            message,
            details,
            originalError
        });
        this.name = 'ValidationError';
    }
}

/**
 * Resource not found errors
 */
export class NotFoundError extends SDKError {
    constructor(message: string, details?: any, originalError?: Error) {
        super({
            code: SDKErrorCode.NOT_FOUND_ERROR,
            message,
            details,
            originalError
        });
        this.name = 'NotFoundError';
    }
}

/**
 * Server errors
 */
export class ServerError extends SDKError {
    constructor(message: string, details?: any, originalError?: Error) {
        super({
            code: SDKErrorCode.SERVER_ERROR,
            message,
            details,
            originalError
        });
        this.name = 'ServerError';
    }
}

/**
 * Timeout errors
 */
export class TimeoutError extends SDKError {
    constructor(message: string, details?: any, originalError?: Error) {
        super({
            code: SDKErrorCode.TIMEOUT_ERROR,
            message,
            details,
            originalError
        });
        this.name = 'TimeoutError';
    }
}

/**
 * Factory function to create appropriate error based on HTTP status
 */
export function createErrorFromResponse(status: number, message: string, data?: any): SDKError {
    switch (true) {
        case status === 401:
            return new AuthenticationError(message || 'Authentication failed', data);
        case status === 403:
            return new AuthorizationError(message || 'Access forbidden', data);
        case status === 404:
            return new NotFoundError(message || 'Resource not found', data);
        case status >= 400 && status < 500:
            return new ValidationError(message || 'Client error', data);
        case status >= 500:
            return new ServerError(message || 'Server error', data);
        default:
            return new SDKError({
                code: SDKErrorCode.UNKNOWN_ERROR,
                message: message || 'Unknown error occurred',
                details: data
            });
    }
}