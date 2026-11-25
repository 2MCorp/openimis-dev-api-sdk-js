export const BULK_CSV_HEADERS = [
  "insuree_chf_id",
  "health_facility_code",
  "date_started",
  "date_ended",
  "date_claimed",
  "visit_type",
  "icd_code",
  "care_type",
  "item_code",
  "item_quantity",
  "item_price",
  "service_code",
  "service_quantity",
  "service_price"
] as const;

export type BulkCsvKind = "claim" | "encounter";

export type ClaimBulkRowInput = {
  patientChfId: string;
  dateFrom: string;
  dateTo?: string;
  dateClaimed?: string;
  visitType?: string;
  primaryDiagnosisCode: string;
  careType?: string;
  healthFacilityCode?: string;
  serviceCode?: string;
  serviceQuantity?: string | number;
  servicePrice?: string | number;
  itemCode?: string;
  itemQuantity?: string | number;
  itemPrice?: string | number;
};

export type BulkCsvParseIssue = { row: number; message: string };

function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function normalizeVisitType(kind: BulkCsvKind, raw: string | undefined): string {
  const v = (raw ?? "").trim().toUpperCase();
  if (kind === "encounter") return "C";
  if (v === "C") return "O";
  if (v === "E" || v === "R" || v === "O") return v;
  return "O";
}

export function buildBulkCsv(
  rows: ClaimBulkRowInput[],
  kind: BulkCsvKind,
  defaultHfCode: string
): string {
  const lines = [BULK_CSV_HEADERS.join(",")];
  for (const row of rows) {
    const dateFrom = row.dateFrom.trim();
    const dateTo = (row.dateTo || dateFrom).trim();
    const dateClaimed = (row.dateClaimed || dateFrom).trim();
    const values = [
      row.patientChfId.trim(),
      (row.healthFacilityCode || defaultHfCode).trim(),
      dateFrom,
      dateTo,
      dateClaimed,
      normalizeVisitType(kind, row.visitType),
      row.primaryDiagnosisCode.trim(),
      (row.careType ?? "").trim(),
      (row.itemCode ?? "").trim(),
      row.itemCode ? String(row.itemQuantity ?? "1") : "",
      row.itemCode ? String(row.itemPrice ?? "0") : "",
      (row.serviceCode ?? "").trim(),
      row.serviceCode ? String(row.serviceQuantity ?? "1") : "",
      row.serviceCode ? String(row.servicePrice ?? "0") : ""
    ];
    lines.push(values.map((v) => csvEscape(String(v))).join(","));
  }
  return `${lines.join("\n")}\n`;
}

export function sampleBulkCsv(kind: BulkCsvKind, hfCode: string): string {
  return buildBulkCsv(
    [
      {
        patientChfId: "160000001",
        dateFrom: "2026-04-16",
        dateTo: "2026-04-16",
        dateClaimed: "2026-04-16",
        visitType: kind === "encounter" ? "C" : "O",
        primaryDiagnosisCode: "A00",
        healthFacilityCode: hfCode || "HF001",
        serviceCode: "SERV001",
        serviceQuantity: "1",
        servicePrice: "100"
      }
    ],
    kind,
    hfCode || "HF001"
  );
}

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      continue;
    }
    if (ch === ",") {
      out.push(cur.trim());
      cur = "";
      continue;
    }
    cur += ch;
  }
  out.push(cur.trim());
  return out;
}

export function rewriteBulkCsvForKind(
  rawCsv: string,
  kind: BulkCsvKind,
  defaultHfCode: string
): { csv: string; issues: BulkCsvParseIssue[] } {
  const text = rawCsv.replace(/^\uFEFF/, "").trim();
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const issues: BulkCsvParseIssue[] = [];
  if (lines.length < 2) {
    return { csv: "", issues: [{ row: 0, message: "CSV must include a header and at least one data row." }] };
  }

  const headers = parseCsvLine(lines[0]).map((h) => h.trim());
  const required = [
    "insuree_chf_id",
    "health_facility_code",
    "date_started",
    "date_ended",
    "date_claimed",
    "visit_type",
    "icd_code"
  ];
  const missing = required.filter((h) => !headers.includes(h));
  if (missing.length) {
    return {
      csv: "",
      issues: [{ row: 0, message: `Missing required columns: ${missing.join(", ")}` }]
    };
  }

  const idx = Object.fromEntries(headers.map((h, i) => [h, i])) as Record<string, number>;
  const outRows: string[] = [headers.join(",")];

  for (let r = 1; r < lines.length; r++) {
    const cols = parseCsvLine(lines[r]);
    while (cols.length < headers.length) cols.push("");

    const chf = cols[idx.insuree_chf_id] ?? "";
    const icd = cols[idx.icd_code] ?? "";
    if (!chf.trim()) issues.push({ row: r, message: "insuree_chf_id is required." });
    if (!icd.trim()) issues.push({ row: r, message: "icd_code is required." });

    if (!cols[idx.health_facility_code]?.trim() && defaultHfCode) {
      cols[idx.health_facility_code] = defaultHfCode;
    }

    const visitRaw = cols[idx.visit_type] ?? "";
    if (kind === "encounter") {
      cols[idx.visit_type] = "C";
    } else {
      const v = visitRaw.trim().toUpperCase();
      if (v === "C") {
        issues.push({
          row: r,
          message: "Claims cannot use visit_type C (encounter). Use E, R, or O."
        });
      } else {
        cols[idx.visit_type] = normalizeVisitType(kind, visitRaw);
      }
    }

    const hasService = Boolean(cols[idx.service_code]?.trim());
    const hasItem = Boolean(cols[idx.item_code]?.trim());
    if (!hasService && !hasItem) {
      issues.push({ row: r, message: "Provide service_code and/or item_code." });
    }

    outRows.push(cols.map((c) => csvEscape(c)).join(","));
  }

  return { csv: `${outRows.join("\n")}\n`, issues };
}

/** Shared by the claims / encounters bulk routes: JSON `items` array → validated rows. */
export function isBulkRow(value: unknown): value is ClaimBulkRowInput {
  if (!value || typeof value !== "object") return false;
  const row = value as ClaimBulkRowInput;
  return (
    typeof row.patientChfId === "string" &&
    typeof row.dateFrom === "string" &&
    typeof row.primaryDiagnosisCode === "string"
  );
}

/** Human-readable one-liner for CSV parse issues (`Row 2: …`). */
export function describeBulkCsvIssues(issues: BulkCsvParseIssue[]): string {
  return issues.map((i) => (i.row ? `Row ${i.row}: ${i.message}` : i.message)).join(" ");
}
