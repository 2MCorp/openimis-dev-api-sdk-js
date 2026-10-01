/**
 * Human-readable lines from `ApiResponse.errorDetails` as produced by the developer API:
 * bulk rows `{row, error}` / `{entry, error}`, DRF field errors `{field, errors}`, or strings.
 * e.g. `Row 3: Insuree not found`.
 */
export function describeErrorDetails(details: readonly unknown[] | undefined, limit = 20): string[] {
  const lines: string[] = [];
  for (const detail of details ?? []) {
    if (lines.length >= limit) break;
    let line: string | null = null;
    if (typeof detail === "string") {
      line = detail;
    } else if (detail && typeof detail === "object") {
      const record = detail as Record<string, unknown>;
      const text = record.error ?? record.message ?? record.errors ?? record.detail;
      const message = Array.isArray(text)
        ? text.map(String).join(" ")
        : text != null && typeof text !== "object"
          ? String(text)
          : "";
      const where =
        record.row != null
          ? `Row ${record.row}`
          : record.entry != null
            ? `Entry ${record.entry}`
            : typeof record.field === "string"
              ? record.field
              : "";
      // Upload errors already read "Row 3: …"; don't prefix twice.
      const prefixed = where && !message.toLowerCase().startsWith(where.toLowerCase());
      if (message) line = prefixed ? `${where}: ${message}` : message;
    }
    const cleaned = line?.trim().split(/\r?\n/)[0]?.trim();
    if (cleaned && !/traceback|<\/?[a-z][\s\S]*>/i.test(cleaned)) lines.push(cleaned);
  }
  return lines;
}
