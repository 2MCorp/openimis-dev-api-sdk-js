import { HF_MUTATION_SSE_PATH, HF_UPDATE_SSE_PATH } from "../../event_bus/types";

export { HF_MUTATION_SSE_PATH, HF_UPDATE_SSE_PATH };

/** Upstream URL + headers for proxying a Developer API event-bus stream. */
export function buildHfSseUpstream(options: {
  developerApiBase: string;
  upstreamPath: string;
  accessToken: string;
  lastEventId?: string | null;
}): { url: string; headers: Record<string, string> } {
  const headers: Record<string, string> = {
    Authorization: `Token ${options.accessToken}`,
    Accept: "text/event-stream",
  };
  if (options.lastEventId) headers["Last-Event-ID"] = options.lastEventId;
  return { url: `${options.developerApiBase}${options.upstreamPath}`, headers };
}

/** Status to report to the browser for a failed upstream (4xx/5xx as-is, else 502). */
export function sseUpstreamErrorStatus(status: number): number {
  return status >= 400 && status < 600 ? status : 502;
}

export const SSE_RESPONSE_HEADERS = {
  "Content-Type": "text/event-stream",
  "Cache-Control": "no-cache, no-transform",
  Connection: "keep-alive",
  "X-Accel-Buffering": "no",
} as const;

function sseError(status: number, error: string): Response {
  return new Response(JSON.stringify({ success: false, error }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * Proxy an authenticated SSE stream (GET /api/notifications/sse/{updates,mutations}).
 * Pass `accessToken: undefined` for a missing session (401). Returns a standard `Response`.
 */
export async function proxyHfSse(
  request: Request,
  options: {
    developerApiBase: string;
    upstreamPath: string;
    accessToken: string | null | undefined;
    fetchImpl?: typeof fetch;
  }
): Promise<Response> {
  if (!options.accessToken) return sseError(401, "Unauthorized");
  const { url, headers } = buildHfSseUpstream({
    developerApiBase: options.developerApiBase,
    upstreamPath: options.upstreamPath,
    accessToken: options.accessToken,
    lastEventId: request.headers.get("Last-Event-ID"),
  });
  const doFetch = options.fetchImpl ?? fetch;

  let upstream: Response;
  try {
    upstream = await doFetch(url, { method: "GET", headers, signal: request.signal });
  } catch (err) {
    console.error("[sse] upstream connect failed", options.upstreamPath, err);
    return sseError(502, "Could not connect to notification stream.");
  }

  if (!upstream.ok || !upstream.body) {
    const detail = await upstream.text().catch(() => "");
    console.error("[sse] upstream error", options.upstreamPath, upstream.status, detail.slice(0, 300));
    return sseError(sseUpstreamErrorStatus(upstream.status), "Notification stream unavailable.");
  }

  return new Response(upstream.body, { status: 200, headers: SSE_RESPONSE_HEADERS });
}
