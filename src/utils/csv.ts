export type CsvCell = string | number | boolean | null | undefined;

/** RFC 4180 escaping plus a guard against spreadsheet formula injection. */
export function csvCell(value: CsvCell): string {
  if (value == null) return "";
  let text = String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** CRLF-separated CSV with a header row. */
export function toCsv(header: readonly string[], rows: readonly CsvCell[][]): string {
  return (
    [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n") + "\r\n"
  );
}

export type CsvColumn<T> = { header: string; value: (row: T) => CsvCell };

/** CSV from typed rows and column definitions. */
export function rowsToCsv<T>(columns: readonly CsvColumn<T>[], rows: readonly T[]): string {
  return toCsv(
    columns.map((c) => c.header),
    rows.map((row) => columns.map((c) => c.value(row)))
  );
}
