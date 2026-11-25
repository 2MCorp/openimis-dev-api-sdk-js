/**
 * Map SDK / HTTP failures to short messages safe to show in the UI.
 * Never forward HTML, Django tracebacks, or huge payloads.
 */
export function toUserFacingApiError(
  statusCode: string | number | null | undefined,
  rawMessage?: string | null,
): string {
  const code = Number(statusCode);
  const cleaned = sanitizeMessage(rawMessage);
  const usable = cleaned && !looksLikeTechnicalDump(cleaned) ? cleaned : null;

  if (code === 0 || Number.isNaN(code)) {
    return usable ?? "Unable to reach the server. Check your connection and try again.";
  }
  if (code === 401) return "Your session has expired. Please sign in again.";
  if (code === 403) return "You do not have permission to perform this action.";
  if (code === 404) return usable ?? "The requested resource was not found.";
  if (code === 408 || code === 504) {
    return "The server took too long to respond. Please try again.";
  }
  if (code >= 500) {
    return usable ?? "Something went wrong on the server. Please try again shortly.";
  }
  if (code >= 400) return usable ?? "The request could not be completed. Please try again.";
  return usable ?? "Something went wrong. Please try again.";
}

function sanitizeMessage(raw?: string | null): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  if (/<html[\s>]/i.test(trimmed) || /<\/?[a-z][\s\S]*>/i.test(trimmed)) {
    return null;
  }

  const firstLine = trimmed.split(/\r?\n/)[0]?.trim() ?? trimmed;
  if (firstLine.length > 180) {
    return `${firstLine.slice(0, 177)}…`;
  }
  return firstLine;
}

function looksLikeTechnicalDump(message: string): boolean {
  return (
    /traceback/i.test(message) ||
    /FieldError|ValueError|TypeError|IntegrityError/i.test(message) ||
    /at Object\.|node_modules|django\./i.test(message) ||
    /pydantic|string_pattern_mismatch|validation errors for Bundle/i.test(message) ||
    message.includes("Internal Server Error")
  );
}
