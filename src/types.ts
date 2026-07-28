import {
  ApiResponse,
  defaultErrorMessage,
  parseErrorBody,
} from "./api_response";

export type AuthScheme = "Token" | "Bearer" | "Api-Key";

export interface HttpClientOptions {
  token?: string;
  /** Knox / insuree default to `Token`. API-key flows may use `Api-Key` or `Bearer`. */
  authScheme?: AuthScheme;
  /** Required for multi-org policy-holder users. Sent as `PolicyHolder-Code`. */
  policyHolderCode?: string;
  /**
   * EMR write operations. Sent as `X-Claim-Admin-Code`.
   * Falls back to plugin `default_claim_admin_code` on the server when omitted.
   */
  claimAdminCode?: string;
}

export interface RequestOptions {
  /** When true, omit Authorization and PolicyHolder-Code headers. */
  skipAuth?: boolean;
  headers?: Record<string, string>;
}

/**
 * @deprecated Prefer `ApiResponse` envelopes from HttpClient.
 * Kept for callers that still catch thrown errors via `throwOnError`.
 */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: unknown,
    message?: string
  ) {
    super(message ?? ApiError.messageFromBody(status, body));
    this.name = "ApiError";
  }

  private static messageFromBody(status: number, body: unknown): string {
    return parseErrorBody(body, status).message || defaultErrorMessage(status);
  }

  static fromResponse<T>(response: ApiResponse<T>): ApiError {
    return new ApiError(
      Number(response.statusCode) || 0,
      {
        detail: response.message,
        error_details: response.errorDetails,
      },
      response.message
    );
  }
}

export default class HttpClient {
  private token?: string;
  private authScheme: AuthScheme;
  private policyHolderCode?: string;
  private claimAdminCode?: string;

  constructor(
    private readonly baseUrl: string,
    options: HttpClientOptions = {}
  ) {
    this.token = options.token;
    this.authScheme = options.authScheme ?? "Token";
    this.policyHolderCode = options.policyHolderCode;
    this.claimAdminCode = options.claimAdminCode;
  }

  getToken(): string | undefined {
    return this.token;
  }

  setToken(token: string | undefined): void {
    this.token = token;
  }

  getAuthScheme(): AuthScheme {
    return this.authScheme;
  }

  setAuthScheme(authScheme: AuthScheme): void {
    this.authScheme = authScheme;
  }

  setPolicyHolderCode(policyHolderCode: string | undefined): void {
    this.policyHolderCode = policyHolderCode;
  }

  getClaimAdminCode(): string | undefined {
    return this.claimAdminCode;
  }

  setClaimAdminCode(claimAdminCode: string | undefined): void {
    this.claimAdminCode = claimAdminCode;
  }

  get<T = unknown>(
    path: string,
    options?: RequestOptions
  ): Promise<ApiResponse<T>> {
    return this.request<T>("GET", path, undefined, options);
  }

  post<T = unknown>(
    path: string,
    body?: unknown,
    options?: RequestOptions
  ): Promise<ApiResponse<T>> {
    return this.request<T>("POST", path, body, options);
  }

  put<T = unknown>(
    path: string,
    body?: unknown,
    options?: RequestOptions
  ): Promise<ApiResponse<T>> {
    return this.request<T>("PUT", path, body, options);
  }

  patch<T = unknown>(
    path: string,
    body?: unknown,
    options?: RequestOptions
  ): Promise<ApiResponse<T>> {
    return this.request<T>("PATCH", path, body, options);
  }

  delete<T = unknown>(
    path: string,
    options?: RequestOptions
  ): Promise<ApiResponse<T>> {
    return this.request<T>("DELETE", path, undefined, options);
  }

  private buildHeaders(options?: RequestOptions): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...options?.headers,
    };

    if (!options?.skipAuth) {
      if (this.token) {
        headers.Authorization = `${this.authScheme} ${this.token}`;
      }

      if (this.policyHolderCode) {
        headers["PolicyHolder-Code"] = this.policyHolderCode;
      }

      if (this.claimAdminCode) {
        headers["X-Claim-Admin-Code"] = this.claimAdminCode;
      }
    }

    return headers;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    options?: RequestOptions
  ): Promise<ApiResponse<T>> {
    const meta = { path, method };

    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers: this.buildHeaders(options),
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
    } catch (error) {
      return ApiResponse.fail<T>(
        "0",
        error instanceof Error ? error.message : "Network error",
        [error instanceof Error ? error.message : String(error)],
        meta
      );
    }

    if (response.status === 204) {
      return ApiResponse.ok<T>(null, 204, undefined, meta);
    }

    const text = await response.text();
    const parsed = text ? HttpClient.tryParseJson(text) : null;

    if (!response.ok) {
      const { message, errorDetails } = parseErrorBody(
        parsed ?? text,
        response.status
      );
      return ApiResponse.fail<T>(response.status, message, errorDetails, {
        ...meta,
        data: (parsed as T) ?? null,
      });
    }

    return ApiResponse.ok<T>(
      (parsed as T) ?? null,
      response.status,
      undefined,
      meta
    );
  }

  private static tryParseJson(text: string): unknown {
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }
}

export { ApiResponse, mapData, passData, parseErrorBody } from "./api_response";
