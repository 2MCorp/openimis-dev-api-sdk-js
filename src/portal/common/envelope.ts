import type { ApiResponse } from "../../types";
import { toUserFacingApiError } from "./user_facing_error";
import type { BackendResult } from "./backend";

/** JSON body every portal API route returns. */
export type ApiEnvelope<T> =
  | { success: true; data: T }
  | {
      success: false;
      error: string;
      /** Per-field validation messages (e.g. `calculationRule.income`) for forms. */
      fieldErrors?: Record<string, string>;
    };

/**
 * Framework-neutral HTTP result: route handlers turn this into a `Response`
 * (`NextResponse.json(result.body, { status: result.status })`).
 */
export type EnvelopeResult<T = unknown> = { status: number; body: ApiEnvelope<T> };

function clampHttpError(code: number, fallback: number): number {
  return code >= 400 && code < 600 ? code : fallback;
}

/** Failure envelope with an already user-safe message. */
export function apiFail(status: number, message: string): EnvelopeResult<never> {
  return { status, body: { success: false, error: message } };
}

/** Success envelope. */
export function apiOk<T>(data: T, status = 200): EnvelopeResult<T> {
  return { status, body: { success: true, data } };
}

/** Envelope for a failed SDK call (message is sanitised). */
export function sdkFail(
  resp: { statusCode: string | number; message: string },
  fallback = 502,
): EnvelopeResult<never> {
  const code = Number(resp.statusCode) || fallback;
  return apiFail(clampHttpError(code, fallback), toUserFacingApiError(code, resp.message));
}

/** Map an SDK `ApiResponse` to an envelope; `map` shapes the payload for the browser. */
export function fromSdkResponse<T, U>(
  resp: ApiResponse<T>,
  map: (data: T) => U,
  notFoundMessage = "Not found",
): EnvelopeResult<U> {
  if (!resp.success || resp.data == null) {
    const code = Number(resp.statusCode) || 502;
    const status = clampHttpError(code, 502);
    const message =
      code === 404 ? notFoundMessage : toUserFacingApiError(resp.statusCode, resp.message);
    return apiFail(status, message);
  }
  return apiOk(map(resp.data));
}

/** Envelope for a `BackendResult` — failures become sanitised `{ success: false, error }`. */
export function fromBackendResult<T>(
  result: Pick<BackendResult<T>, "ok" | "status" | "message" | "data"> & {
    fieldErrors?: Record<string, string>;
  },
  options: { status?: number; notFoundMessage?: string } = {},
): EnvelopeResult<T> {
  if (!result.ok || result.data === null) {
    const code = clampHttpError(result.status, 502);
    const message =
      code === 404 && options.notFoundMessage
        ? options.notFoundMessage
        : toUserFacingApiError(result.status, result.message);
    if (result.fieldErrors && code === 400) {
      return {
        status: code,
        body: { success: false, error: message, fieldErrors: result.fieldErrors },
      };
    }
    return apiFail(code, message);
  }
  return apiOk(result.data, options.status ?? 200);
}

/** Non-negative integer from a query value, floored and capped at `max`. */
export function parsePositiveInt(
  value: string | null | undefined,
  fallback: number,
  max = 100,
): number {
  const n = Number(value ?? fallback);
  if (!Number.isFinite(n) || n < 0) return fallback;
  return Math.min(Math.floor(n), max);
}

/**
 * OpenIMIS FHIR `page-offset` is a 1-based page number (PageNumberPagination),
 * despite the name. Omit or coerce values below 1 so DRF uses page 1.
 */
export function parseFhirPageOffset(value: string | null | undefined): number | undefined {
  if (value == null || value.trim() === "") return undefined;
  const n = Number(value);
  if (!Number.isFinite(n)) return undefined;
  const page = Math.floor(n);
  return page < 1 ? undefined : page;
}

/** Common FHIR list paging params (`page-offset` is 1-based, `_count` capped). */
export function pagingFromSearchParams(
  params: { get(name: string): string | null },
  defaultCount = 10,
  maxCount = 50,
): { pageOffset: number | undefined; count: number } {
  return {
    pageOffset: parseFhirPageOffset(params.get("page-offset")),
    count: parsePositiveInt(params.get("_count"), defaultCount, maxCount),
  };
}

/** Query string from defined, non-empty values (no leading `?`). */
export function buildQueryString(
  params: Record<string, string | number | undefined | null>,
): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    search.set(key, String(value));
  }
  return search.toString();
}
