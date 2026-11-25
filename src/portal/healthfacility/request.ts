/** Minimal `URLSearchParams` surface the handlers need. */
export type SearchParamsLike = { get(name: string): string | null };

/** Sentinel for a request body that is not valid JSON. */
export const INVALID_JSON_BODY: unique symbol = Symbol("invalid-json-body");

/** `await request.json()` that yields {@link INVALID_JSON_BODY} instead of throwing. */
export async function readJsonBody(request: { json(): Promise<unknown> }): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return INVALID_JSON_BODY;
  }
}

/** For routes where unparsable JSON means "empty object" (auth / staff / enrollment). */
export function jsonBodyOrEmpty(body: unknown): unknown {
  return body === INVALID_JSON_BODY ? {} : body;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}
