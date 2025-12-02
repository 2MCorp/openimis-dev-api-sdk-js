/**
 * HTTP Client utility for the Developer API FHIR Client SDK
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosError } from 'axios';
import { HTTPResponse, SDKConfig } from "./types";
import { createErrorFromResponse, NetworkError, TimeoutError } from "./errors";

export interface RequestConfig {
  headers?: Record<string, string>;
  timeout?: number;
  retries?: number;
}

/**
 * HTTP Client class with retry logic and proper error handling
 */
export class HTTPClient {
  private axiosInstance: AxiosInstance;
  private defaultRetries: number;

  constructor(config: SDKConfig) {
    this.defaultRetries = config.retries || 3;

    this.axiosInstance = axios.create({
      baseURL: config.baseUrl.replace(/\/$/, ""),
      timeout: config.timeout || 30000,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });
  }

  /**
   * Set authentication token
   */
  setAuthToken(token: string): void {
    this.axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }

  /**
   * Remove authentication token
   */
  clearAuthToken(): void {
    delete this.axiosInstance.defaults.headers.common['Authorization'];
  }

  /**
   * Make HTTP request with retry logic
   */
  private async makeRequest(
    method: string,
    url: string,
    data?: any,
    config?: RequestConfig,
  ): Promise<HTTPResponse> {
    const retries = config?.retries || this.defaultRetries;
    const timeout = config?.timeout || this.axiosInstance.defaults.timeout;

    const axiosConfig: AxiosRequestConfig = {
      method: method as any,
      url,
      data,
      timeout,
      headers: config?.headers,
    };

    let lastError: Error;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await this.axiosInstance.request(axiosConfig);

        return {
          data: response.data,
          status: response.status,
          headers: response.headers as Record<string, string>,
        };
      } catch (error: any) {
        lastError = error;

        if (axios.isAxiosError(error)) {
          const status = error.response?.status;

          // Don't retry on client errors (4xx) except 429 (Too Many Requests)
          if (status && status >= 400 && status < 500 && status !== 429) {
            const errorMessage =
              error.response?.data?.message ||
              error.response?.data?.detail ||
              error.message;
            throw createErrorFromResponse(status, errorMessage, error.response?.data);
          }

          if (error.code === 'ECONNABORTED' && error.message.includes('timeout')) {
            const timeoutError = new TimeoutError(
              `Request timeout after ${timeout}ms`,
              { url, attempt: attempt + 1 },
            );
            if (attempt === retries) {
              throw timeoutError;
            }
            lastError = timeoutError;
          } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
            const networkError = new NetworkError(
              `Network error: ${error.message}`,
              { url, attempt: attempt + 1 },
            );
            if (attempt === retries) {
              throw networkError;
            }
            lastError = networkError;
          } else if (error.response) {
            // Server responded with error status
            const errorMessage =
              error.response.data?.message ||
              error.response.data?.detail ||
              `HTTP ${error.response.status}: ${error.response.statusText}`;
            throw createErrorFromResponse(error.response.status, errorMessage, error.response.data);
          }
        }

        if (attempt < retries) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 10000); // Max 10 seconds
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError!;
  }

  /**
   * GET request
   */
  async get(url: string, config?: RequestConfig): Promise<HTTPResponse> {
    return this.makeRequest('GET', url, undefined, config);
  }

  /**
   * POST request
   */
  async post(
    url: string,
    data?: any,
    config?: RequestConfig,
  ): Promise<HTTPResponse> {
    return this.makeRequest('POST', url, data, config);
  }

  /**
   * PUT request
   */
  async put(
    url: string,
    data?: any,
    config?: RequestConfig,
  ): Promise<HTTPResponse> {
    return this.makeRequest('PUT', url, data, config);
  }

  /**
   * DELETE request
   */
  async delete(url: string, config?: RequestConfig): Promise<HTTPResponse> {
    return this.makeRequest('DELETE', url, undefined, config);
  }

  /**
   * PATCH request
   */
  async patch(
    url: string,
    data?: any,
    config?: RequestConfig,
  ): Promise<HTTPResponse> {
    return this.makeRequest('PATCH', url, data, config);
  }
}

/**
 * Utility function to create API response
 */
export function createResponse<T>(
  data: T,
  message: string = "Success",
): { success: boolean; message: string; data: T } {
  return {
    success: true,
    message,
    data,
  };
}

/**
 * Utility function to create error response
 */
export function createErrorResponse(
  message: string,
  errorDetails?: string[],
): { success: boolean; message: string; errorDetails?: string[] } {
  return {
    success: false,
    message,
    errorDetails,
  };
}

export interface SdkResponse {
  success: boolean;
  message: string;
  errorDetails?: string[];
  data?: unknown;
}

export type FetchError = AxiosError;

export async function postReq(
  url: string,
  body: any,
  authToken?: string,
): Promise<{ data: any; status: number }> {
  try {
    const config: AxiosRequestConfig = {
      headers: {
        "Content-Type": "application/json",
        ...(authToken ? { Authorization: `Token ${authToken}` } : {}),
      },
    };

    const response = await axios.post(url, body, config);
    return { data: response.data, status: response.status };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw error;
    }
    throw new Error(`Request failed: ${error}`);
  }
}

export async function getReq(
  url: string,
  authToken?: string,
): Promise<{ data: any; status: number }> {
  try {
    const config: AxiosRequestConfig = {
      headers: {
        "Content-Type": "application/json",
        ...(authToken ? { Authorization: `Token ${authToken}` } : {}),
      },
    };

    const response = await axios.get(url, config);
    return { data: response.data, status: response.status };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw error;
    }
    throw new Error(`Request failed: ${error}`);
  }
}
