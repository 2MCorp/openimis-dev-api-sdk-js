import type { RequestOptions } from "../../src/types";
import HttpClient from "../../src/types";

export type HttpCall = {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  body?: unknown;
  options?: RequestOptions;
};

/**
 * In-memory HttpClient stand-in for unit tests.
 * Match responses by method + path prefix or exact path.
 */
export class MockHttpClient {
  public readonly calls: HttpCall[] = [];
  private readonly handlers: Array<{
    method: HttpCall["method"];
    match: string | RegExp;
    response: unknown | ((call: HttpCall) => unknown);
  }> = [];

  on(
    method: HttpCall["method"],
    match: string | RegExp,
    response: unknown | ((call: HttpCall) => unknown)
  ): this {
    this.handlers.push({ method, match, response });
    return this;
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
  ): Promise<unknown> {
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
      throw new Error(`No mock response for ${method} ${path}`);
    }

    const value =
      typeof handler.response === "function"
        ? handler.response(call)
        : handler.response;

    return Promise.resolve(value);
  }

  get<T>(path: string, options?: RequestOptions): Promise<T> {
    return this.resolve("GET", path, undefined, options) as Promise<T>;
  }

  post<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.resolve("POST", path, body, options) as Promise<T>;
  }

  put<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.resolve("PUT", path, body, options) as Promise<T>;
  }

  patch<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.resolve("PATCH", path, body, options) as Promise<T>;
  }

  delete<T>(path: string, options?: RequestOptions): Promise<T> {
    return this.resolve("DELETE", path, undefined, options) as Promise<T>;
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
