export class ApiClientError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    /** Per-field validation messages from the server (e.g. `calculationRule.income`). */
    public readonly fieldErrors: Record<string, string> = {},
  ) {
    super(message);
    this.name = "ApiClientError";
  }

  get notFound(): boolean {
    return this.status === 404;
  }

  get unauthorized(): boolean {
    return this.status === 401;
  }
}

export type FetchApiJsonOptions = {
  /**
   * Message for a network failure (`fetch` rejects with `TypeError`, status 0). Pass the app's
   * translated "this action needs a connection" text; without it the original error is rethrown.
   */
  offlineMessage?: string | (() => string);
  /** `window` event fired on HTTP 401 so the layout can offer re-login (e.g. `hf:session-expired`). */
  sessionExpiredEvent?: string;
};

/**
 * Fetch an `ApiEnvelope` JSON route on the same origin and return `data`.
 * Throws `ApiClientError` with a user-facing message on failure.
 */
export async function fetchApiJson<T>(
  url: string,
  init?: RequestInit,
  options: FetchApiJsonOptions = {},
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      headers: { Accept: "application/json", ...(init?.headers ?? {}) },
    });
  } catch (err) {
    // `fetch` only rejects when the network is unreachable (it does not throw on HTTP errors).
    if (err instanceof TypeError && options.offlineMessage !== undefined) {
      const message =
        typeof options.offlineMessage === "function"
          ? options.offlineMessage()
          : options.offlineMessage;
      throw new ApiClientError(message, 0);
    }
    throw err;
  }

  let body: {
    success?: boolean;
    data?: T;
    error?: string;
    fieldErrors?: Record<string, string>;
  } | null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }

  if (res.status === 401 && options.sessionExpiredEvent && typeof window !== "undefined") {
    // The layout listens and offers re-login; we never redirect here so form data is not lost.
    window.dispatchEvent(new Event(options.sessionExpiredEvent));
  }

  if (!res.ok || !body?.success || body.data === undefined) {
    throw new ApiClientError(
      body?.error || `Request failed (${res.status})`,
      res.status,
      body?.fieldErrors ?? {},
    );
  }
  return body.data;
}
