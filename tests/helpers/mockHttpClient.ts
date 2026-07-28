import type { RequestOptions } from "../../src/types";
import HttpClient, { ApiResponse } from "../../src/types";

export type HttpCall = {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  body?: unknown;
  options?: RequestOptions;
};

/**
 * In-memory HttpClient stand-in for unit tests.
 * Returns `ApiResponse` envelopes like the real client.
 */
export class MockHttpClient {
  public readonly calls: HttpCall[] = [];
  private readonly handlers: Array<{
    method: HttpCall["method"];
    match: string | RegExp;
    response: unknown | ((call: HttpCall) => unknown);
    statusCode?: number | string;
    success?: boolean;
    message?: string;
    errorDetails?: unknown[];
  }> = [];

  on(
    method: HttpCall["method"],
    match: string | RegExp,
    response: unknown | ((call: HttpCall) => unknown),
    options: {
      statusCode?: number | string;
      success?: boolean;
      message?: string;
      errorDetails?: unknown[];
    } = {}
  ): this {
    this.handlers.push({
      method,
      match,
      response,
      statusCode: options.statusCode,
      success: options.success,
      message: options.message,
      errorDetails: options.errorDetails,
    });
    return this;
  }

  /** Register a failed HTTP response for a path. */
  onError(
    method: HttpCall["method"],
    match: string | RegExp,
    statusCode: number | string,
    message: string,
    errorDetails: unknown[] = []
  ): this {
    return this.on(method, match, null, {
      statusCode,
      success: false,
      message,
      errorDetails,
    });
  }

  asHttpClient(): HttpClient {
    return this as unknown as HttpClient;
  }

  get lastCall(): HttpCall | undefined {
    return this.calls[this.calls.length - 1];
  }

  private resolve(
    method: HttpCall["method"],
    path: string,
    body?: unknown,
    options?: RequestOptions
  ): Promise<ApiResponse<unknown>> {
    const call: HttpCall = { method, path, body, options };
    this.calls.push(call);

    const handler = [...this.handlers]
      .reverse()
      .find((entry) => {
        if (entry.method !== method) {
          return false;
        }
        if (typeof entry.match === "string") {
          return path === entry.match || path.startsWith(entry.match);
        }
        return entry.match.test(path);
      });

    if (!handler) {
      return Promise.resolve(
        ApiResponse.fail("500", `No mock response for ${method} ${path}`, [
          `No mock response for ${method} ${path}`,
        ], { path, method })
      );
    }

    const value =
      typeof handler.response === "function"
        ? handler.response(call)
        : handler.response;

    if (handler.success === false) {
      return Promise.resolve(
        ApiResponse.fail(
          handler.statusCode ?? 500,
          handler.message ?? "Error",
          handler.errorDetails ?? [],
          { path, method }
        )
      );
    }

    const status = handler.statusCode ?? (value === undefined ? 204 : 200);
    return Promise.resolve(
      ApiResponse.ok(value ?? null, status, handler.message, { path, method })
    );
  }

  get<T>(path: string, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.resolve("GET", path, undefined, options) as Promise<ApiResponse<T>>;
  }

  post<T>(
    path: string,
    body?: unknown,
    options?: RequestOptions
  ): Promise<ApiResponse<T>> {
    return this.resolve("POST", path, body, options) as Promise<ApiResponse<T>>;
  }

  put<T>(
    path: string,
    body?: unknown,
    options?: RequestOptions
  ): Promise<ApiResponse<T>> {
    return this.resolve("PUT", path, body, options) as Promise<ApiResponse<T>>;
  }

  patch<T>(
    path: string,
    body?: unknown,
    options?: RequestOptions
  ): Promise<ApiResponse<T>> {
    return this.resolve("PATCH", path, body, options) as Promise<ApiResponse<T>>;
  }

  delete<T>(path: string, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.resolve("DELETE", path, undefined, options) as Promise<
      ApiResponse<T>
    >;
  }
}

export function searchBundle(
  resourceType: string,
  resources: Record<string, unknown>[],
  total = resources.length
): fhir4.Bundle {
  return {
    resourceType: "Bundle",
    type: "searchset",
    total,
    link: [
      { relation: "self", url: "https://example.test/self" },
      { relation: "next", url: "https://example.test/next" },
    ],
    entry: resources.map((resource) => ({
      resource: { resourceType, ...resource } as fhir4.FhirResource,
    })),
  };
}

export function collectionBundle(
  resources: Record<string, unknown>[]
): fhir4.Bundle {
  return {
    resourceType: "Bundle",
    type: "collection",
    entry: resources.map((resource) => ({
      resource: resource as fhir4.FhirResource,
    })),
  };
}
