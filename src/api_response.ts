/**
 * Uniform envelope returned by every SDK HTTP call.
 *
 * Shape (camelCase in TS; `toJSON()` emits snake_case for interop):
 *   success, message, status_code, error_details, data, path, method, timestamp
 */
export class ApiResponse<T = unknown> {
  constructor(
    public readonly success: boolean,
    public readonly message: string,
    /** HTTP status as a string (e.g. `"200"`, `"403"`). `"0"` = network failure. */
    public readonly statusCode: string,
    public readonly errorDetails: unknown[] = [],
    public readonly data: T | null = null,
    public readonly path?: string,
    public readonly method?: string,
    public readonly timestamp: string = new Date().toISOString()
  ) {}

  static ok<T>(
    data: T | null,
    statusCode: number | string = 200,
    message?: string,
    meta: { path?: string; method?: string; timestamp?: string } = {}
  ): ApiResponse<T> {
    const code = String(statusCode);
    return new ApiResponse<T>(
      true,
      message ?? defaultSuccessMessage(code),
      code,
      [],
      data,
      meta.path,
      meta.method,
      meta.timestamp
    );
  }

  static fail<T = never>(
    statusCode: number | string,
    message: string,
    errorDetails: unknown[] = [],
    meta: { path?: string; method?: string; timestamp?: string; data?: T | null } = {}
  ): ApiResponse<T> {
    return new ApiResponse<T>(
      false,
      message,
      String(statusCode),
      errorDetails,
      meta.data ?? null,
      meta.path,
      meta.method,
      meta.timestamp
    );
  }

  /** Propagate a failed response while changing the data type parameter. */
  asFailure<U = never>(): ApiResponse<U> {
    return ApiResponse.fail<U>(this.statusCode, this.message, this.errorDetails, {
      path: this.path,
      method: this.method,
      timestamp: this.timestamp,
    });
  }

  /**
   * Throw if `success` is false. Useful when callers prefer exceptions
   * after inspecting the envelope.
   */
  unwrap(): T {
    if (!this.success) {
      throw new Error(`${this.statusCode}: ${this.message}`);
    }
    return this.data as T;
  }

  toJSON(): Record<string, unknown> {
    return {
      success: this.success,
      message: this.message,
      status_code: this.statusCode,
      error_details: this.errorDetails,
      data: this.data,
      path: this.path,
      method: this.method,
      timestamp: this.timestamp,
    };
  }
}

function defaultSuccessMessage(statusCode: string): string {
  switch (statusCode) {
    case "200":
      return "OK";
    case "201":
      return "Created";
    case "202":
      return "Accepted";
    case "204":
      return "No Content";
    default:
      return "Success";
  }
}

export function defaultErrorMessage(statusCode: number | string): string {
  switch (String(statusCode)) {
    case "0":
      return "Network error";
    case "400":
      return "Bad request";
    case "401":
      return "Unauthorized";
    case "403":
      return "Forbidden";
    case "404":
      return "Not found";
    case "405":
      return "Method not allowed";
    case "408":
      return "Request timeout";
    case "409":
      return "Conflict";
    case "422":
      return "Validation error";
    case "429":
      return "Too many requests";
    case "500":
      return "Internal server error";
    case "502":
      return "Bad gateway";
    case "503":
      return "Service unavailable";
    case "504":
      return "Gateway timeout";
    default:
      return `HTTP ${statusCode}`;
  }
}

/**
 * First human-readable message from DRF field errors ({ field: "msg" | ["msg"] })
 * or non_field_errors, so e.g. { insuree: "Insuree is already linked ..." }
 * surfaces instead of a generic "Bad request".
 */
function firstFieldMessage(record: Record<string, unknown>): string | undefined {
  const first = (value: unknown): string | undefined => {
    if (typeof value === "string") return value || undefined;
    if (Array.isArray(value)) {
      for (const item of value) {
        const found = first(item);
        if (found) return found;
      }
    }
    return undefined;
  };

  const nonField = first(record.non_field_errors);
  if (nonField) return nonField;

  const skip = ["detail", "message", "error", "errors", "error_details", "traceback", "trace", "data"];
  for (const [key, value] of Object.entries(record)) {
    if (skip.includes(key)) continue;
    const found = first(value);
    if (found) return found;
  }
  return undefined;
}

/**
 * Extract a human message + structured error details from a DRF / FHIR / plain body.
 */
export function parseErrorBody(body: unknown, statusCode: number | string): {
  message: string;
  errorDetails: unknown[];
} {
  const fallback = defaultErrorMessage(statusCode);

  if (body == null || body === "") {
    return { message: fallback, errorDetails: [] };
  }

  if (typeof body === "string") {
    return { message: body || fallback, errorDetails: [body] };
  }

  if (typeof body !== "object") {
    return { message: fallback, errorDetails: [body] };
  }

  const record = body as Record<string, unknown>;
  const details: unknown[] = [];

  const pushDetail = (value: unknown) => {
    if (value === undefined || value === null) return;
    if (Array.isArray(value)) {
      for (const item of value) details.push(item);
      return;
    }
    details.push(value);
  };

  // Prefer explicit lists from backend.
  if (Array.isArray(record.error_details)) {
    pushDetail(record.error_details);
  } else if (Array.isArray(record.errors)) {
    pushDetail(record.errors);
  } else if (Array.isArray(record.non_field_errors)) {
    pushDetail(record.non_field_errors);
  }

  if (record.detail !== undefined) {
    pushDetail(record.detail);
  }
  if (record.error !== undefined && typeof record.error !== "string") {
    pushDetail(record.error);
  }
  if (record.error_details !== undefined && !Array.isArray(record.error_details)) {
    pushDetail(record.error_details);
  }
  if (Array.isArray(record.traceback)) {
    pushDetail({ traceback: record.traceback });
  }
  if (Array.isArray(record.trace)) {
    pushDetail({ trace: record.trace });
  }

  // DRF field errors: { field: ["msg"] }
  for (const [key, value] of Object.entries(record)) {
    if (
      [
        "detail",
        "message",
        "error",
        "errors",
        "error_details",
        "non_field_errors",
        "traceback",
        "trace",
        "data",
      ].includes(key)
    ) {
      continue;
    }
    if (Array.isArray(value) || typeof value === "string") {
      details.push({ field: key, errors: value });
    }
  }

  const message =
    (typeof record.detail === "string" && record.detail) ||
    (typeof record.message === "string" && record.message) ||
    (typeof record.error === "string" && record.error) ||
    firstFieldMessage(record) ||
    fallback;

  return {
    message,
    errorDetails: details.length ? details : [record],
  };
}

/**
 * On success, map the raw JSON body into a typed model.
 * On failure (or mapper throw), return a failed ApiResponse.
 */
export function mapData<T>(
  response: ApiResponse<unknown>,
  mapper: (raw: unknown) => T,
  successMessage?: string
): ApiResponse<T> {
  if (!response.success) {
    return response.asFailure<T>();
  }

  try {
    const data = mapper(response.data);
    return ApiResponse.ok(data, response.statusCode, successMessage ?? response.message, {
      path: response.path,
      method: response.method,
      timestamp: response.timestamp,
    });
  } catch (error) {
    return ApiResponse.fail<T>(
      "422",
      "Failed to parse response payload",
      [error instanceof Error ? error.message : String(error)],
      { path: response.path, method: response.method }
    );
  }
}

/** Pass-through when the raw body is already the desired type (or void/null). */
export function passData<T>(
  response: ApiResponse<unknown>,
  successMessage?: string
): ApiResponse<T> {
  if (!response.success) {
    return response.asFailure<T>();
  }
  return ApiResponse.ok(
    response.data as T,
    response.statusCode,
    successMessage ?? response.message,
    {
      path: response.path,
      method: response.method,
      timestamp: response.timestamp,
    }
  );
}
