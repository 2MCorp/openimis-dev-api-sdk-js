import type { ApiResponse } from "../../api_response";
import { toUserFacingApiError } from "../common/user_facing_error";

/**
 * `{ status, body }` envelope returned by every employer API handler. A Next.js (or any
 * other) route handler only has to serialise `body` as JSON with `status`.
 * Body shape matches the original SvelteKit routes: `{ success, data | error }`.
 */
export type ApiSuccessBody<T> = { success: true; data: T };
export type ApiFailureBody = {
  success: false;
  error: string;
  /** Per-field messages (e.g. `calculationRule.income`) — only on 400s of enrol/update. */
  fieldErrors?: Record<string, string>;
  /** Row-level upload problems (`Row 3: …`). */
  rowErrors?: string[];
};
export type ApiEnvelope<T> = { status: number; body: ApiSuccessBody<T> | ApiFailureBody };

export function ok<T>(data: T, status = 200): ApiEnvelope<T> {
  return { status, body: { success: true, data } };
}

export function fail(
  status: number,
  error: string,
  extra: Pick<ApiFailureBody, "fieldErrors" | "rowErrors"> = {}
): ApiEnvelope<never> {
  return { status, body: { success: false, error, ...extra } };
}

/** HTTP status safe to send (SDK reports 0 for network failures). */
export function httpStatus(status: number | string | undefined, fallback = 400): number {
  const code = Number(status);
  return code >= 400 && code < 600 ? code : fallback;
}

export type RespondOptions = {
  /** Success status (e.g. 201 for creates). Default 200. */
  status?: number;
  /** Message used instead of the backend's for a 404. */
  notFoundMessage?: string;
  /** Per-field messages attached to a 400. */
  fieldErrors?: Record<string, string>;
  /** Replaces the SDK message before it is sanitised. */
  message?: string;
};

/**
 * Map an SDK response to an envelope: failures (or an empty success) become sanitised
 * `{ success: false, error }`; data is passed through `map` into plain DTOs.
 */
export function respond<T, U>(
  resp: ApiResponse<T>,
  map: (data: T) => U,
  options: RespondOptions = {}
): ApiEnvelope<U> {
  if (!resp.success || resp.data == null) {
    const status = Number(resp.statusCode) || 0;
    const code = httpStatus(status, 502);
    const message =
      code === 404 && options.notFoundMessage
        ? options.notFoundMessage
        : toUserFacingApiError(status, options.message ?? resp.message);
    return options.fieldErrors && code === 400
      ? fail(code, message, { fieldErrors: options.fieldErrors })
      : fail(code, message);
  }
  return ok(map(resp.data), options.status ?? 200);
}

/** Unwrap an envelope for server-side rendering: data on success, else `null`. */
export function envelopeData<T>(envelope: ApiEnvelope<T>): T | null {
  return envelope.body.success ? envelope.body.data : null;
}

/** Error message of a failed envelope, else `null`. */
export function envelopeError<T>(envelope: ApiEnvelope<T>): string | null {
  return envelope.body.success ? null : envelope.body.error;
}

// ── Query-string helpers ────────────────────────────────────────────────────────────

export type SearchParamsInput =
  | URLSearchParams
  | string
  | Record<string, string | number | null | undefined>;

/** Accepts `url.searchParams`, a raw query string or a plain object. */
export function toSearchParams(input: SearchParamsInput | undefined): URLSearchParams {
  if (input == null) return new URLSearchParams();
  if (input instanceof URLSearchParams) return input;
  if (typeof input === "string") return new URLSearchParams(input.replace(/^\?/, ""));
  const out = new URLSearchParams();
  for (const [key, value] of Object.entries(input)) {
    if (value != null) out.set(key, String(value));
  }
  return out;
}

/** Trimmed query value, `undefined` when absent. */
export function param(params: URLSearchParams, name: string): string | undefined {
  return params.get(name)?.trim();
}

export function parsePositiveInt(value: string | null, fallback: number, max = 100): number {
  const n = Number(value ?? fallback);
  if (!Number.isFinite(n) || n < 0) return fallback;
  return Math.min(Math.floor(n), max);
}

/**
 * OpenIMIS FHIR `page-offset` is a 1-based page number (PageNumberPagination),
 * despite the name. Omit or coerce values below 1 so DRF uses page 1.
 */
export function parseFhirPageOffset(value: string | null): number | undefined {
  if (value == null || value.trim() === "") return undefined;
  const n = Number(value);
  if (!Number.isFinite(n)) return undefined;
  const page = Math.floor(n);
  return page < 1 ? undefined : page;
}

/** Common FHIR list paging params (`page-offset` is 1-based, `_count` capped). */
export function pagingFromParams(params: URLSearchParams, defaultCount = 10, maxCount = 50) {
  return {
    pageOffset: parseFhirPageOffset(params.get("page-offset")),
    count: parsePositiveInt(params.get("_count"), defaultCount, maxCount),
  };
}

/** Parse a request body that may be absent or malformed: never throws. */
export async function readJson(request: { json(): Promise<unknown> }): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}
