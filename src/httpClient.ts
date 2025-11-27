/**
 * HTTP Client utility for the Developer API FHIR Client SDK
 */

import { HTTPResponse, SDKConfig } from './types';
import { createErrorFromResponse, NetworkError, TimeoutError } from './errors';

export interface RequestConfig {
    headers?: Record<string, string>;
    timeout?: number;
    retries?: number;
}

/**
 * HTTP Client class with retry logic and proper error handling
 */
export class HTTPClient {
    private baseUrl: string;
    private defaultTimeout: number;
    private defaultRetries: number;
    private defaultHeaders: Record<string, string>;

    constructor(config: SDKConfig) {
        this.baseUrl = config.baseUrl.replace(/\/$/, '');
        this.defaultTimeout = config.timeout || 30000;
        this.defaultRetries = config.retries || 3;
        this.defaultHeaders = {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };
    }

    /**
     * Set authentication token
     */
    setAuthToken(token: string): void {
        this.defaultHeaders.Authorization = `Token ${token}`;
    }

    /**
     * Remove authentication token
     */
    clearAuthToken(): void {
        delete this.defaultHeaders.Authorization;
    }

    /**
     * Make HTTP request with retry logic
     */
    private async makeRequest(
        url: string,
        options: RequestInit,
        config?: RequestConfig
    ): Promise<HTTPResponse> {
        const fullUrl = url.startsWith('http') ? url : `${this.baseUrl}${url}`;
        const timeout = config?.timeout || this.defaultTimeout;
        const retries = config?.retries || this.defaultRetries;

        const headers = {
            ...this.defaultHeaders,
            ...config?.headers
        };

        let lastError: Error;

        for (let attempt = 0; attempt <= retries; attempt++) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), timeout);

                const response = await fetch(fullUrl, {
                    ...options,
                    headers,
                    signal: controller.signal
                });

                clearTimeout(timeoutId);

                let data: any = null;
                const contentType = response.headers.get('content-type');

                if (contentType?.includes('application/json')) {
                    try {
                        data = await response.json();
                    } catch (e) {
                        // If JSON parsing fails, leave data as null
                    }
                } else {
                    try {
                        data = await response.text();
                    } catch (e) {
                        // If text parsing fails, leave data as null
                    }
                }

                if (!response.ok) {
                    const errorMessage = data?.message || data?.detail || `HTTP ${response.status}: ${response.statusText}`;
                    throw createErrorFromResponse(response.status, errorMessage, data);
                }

                return {
                    data,
                    status: response.status,
                    headers: Object.fromEntries(response.headers.entries())
                };

            } catch (error: any) {
                lastError = error;

                // Don't retry on client errors (4xx) except 429 (Too Many Requests)
                if (error.name?.includes('Error') && error.status >= 400 && error.status < 500 && error.status !== 429) {
                    throw error;
                }

                // Handle timeout
                if (error.name === 'AbortError') {
                    const timeoutError = new TimeoutError(`Request timeout after ${timeout}ms`, { url: fullUrl, attempt: attempt + 1 });
                    if (attempt === retries) {
                        throw timeoutError;
                    }
                    lastError = timeoutError;
                }

                // Handle network errors
                if (error.code === 'NETWORK_ERROR' || error.name === 'TypeError') {
                    const networkError = new NetworkError(`Network error: ${error.message}`, { url: fullUrl, attempt: attempt + 1 });
                    if (attempt === retries) {
                        throw networkError;
                    }
                    lastError = networkError;
                }

                // Wait before retry (exponential backoff)
                if (attempt < retries) {
                    const delay = Math.min(1000 * Math.pow(2, attempt), 10000); // Max 10 seconds
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }

        throw lastError!;
    }

    /**
     * GET request
     */
    async get(url: string, config?: RequestConfig): Promise<HTTPResponse> {
        return this.makeRequest(url, { method: 'GET' }, config);
    }

    /**
     * POST request
     */
    async post(url: string, data?: any, config?: RequestConfig): Promise<HTTPResponse> {
        const body = data ? JSON.stringify(data) : undefined;
        return this.makeRequest(url, { method: 'POST', body }, config);
    }

    /**
     * PUT request
     */
    async put(url: string, data?: any, config?: RequestConfig): Promise<HTTPResponse> {
        const body = data ? JSON.stringify(data) : undefined;
        return this.makeRequest(url, { method: 'PUT', body }, config);
    }

    /**
     * DELETE request
     */
    async delete(url: string, config?: RequestConfig): Promise<HTTPResponse> {
        return this.makeRequest(url, { method: 'DELETE' }, config);
    }

    /**
     * PATCH request
     */
    async patch(url: string, data?: any, config?: RequestConfig): Promise<HTTPResponse> {
        const body = data ? JSON.stringify(data) : undefined;
        return this.makeRequest(url, { method: 'PATCH', body }, config);
    }
}

/**
 * Utility function to create API response
 */
export function createResponse<T>(data: T, message: string = 'Success'): { success: boolean; message: string; data: T } {
    return {
        success: true,
        message,
        data
    };
}

/**
 * Utility function to create error response
 */
export function createErrorResponse(message: string, errorDetails?: string[]): { success: boolean; message: string; errorDetails?: string[] } {
    return {
        success: false,
        message,
        errorDetails
    };
}

// Legacy exports for backward compatibility
export interface SdkResponse {
    success: boolean;
    message: string;
    errorDetails?: string[];
    data?: unknown;
}

export type FetchError = {
    response?: {
        data?: any;
        status?: number;
    };
    message: string;
};

// Legacy function wrappers
export async function postReq(
    url: string,
    body: any,
    authToken?: string
): Promise<{ data: any; status: number }> {
    const client = new HTTPClient({ baseUrl: '' });
    if (authToken) {
        client.setAuthToken(authToken);
    }
    const response = await client.post(url, body);
    return { data: response.data, status: response.status };
}

export async function getReq(
    url: string,
    authToken?: string
): Promise<{ data: any; status: number }> {
    const client = new HTTPClient({ baseUrl: '' });
    if (authToken) {
        client.setAuthToken(authToken);
    }
    const response = await client.get(url);
    return { data: response.data, status: response.status };
}