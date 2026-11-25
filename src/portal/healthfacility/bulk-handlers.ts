import type OpenIMISDevApiSdk from "../../index";
import { apiFail, apiOk } from "../common/envelope";
import type { EnvelopeResult } from "../common/envelope";
import {
  buildBulkCsv,
  describeBulkCsvIssues,
  isBulkRow,
  rewriteBulkCsvForKind,
  type BulkCsvKind,
  type ClaimBulkRowInput,
} from "./bulk-csv";
import { INVALID_JSON_BODY } from "./request";
import type { BulkClaimUploadResultDto } from "./types";

/** Upload a prepared CSV through the SDK and map it to the plain DTO. */
export async function postBulkEncountersCsv(
  sdk: OpenIMISDevApiSdk,
  csv: string,
  filename = "bulk.csv"
): Promise<{ ok: boolean; status: number; data?: BulkClaimUploadResultDto; error?: string }> {
  const blob = new Blob([csv], { type: "text/csv" });
  const resp = await sdk.healthFacility.bulk.uploadEncountersCsv(blob, filename);

  if (!resp.success || !resp.data) {
    return {
      ok: false,
      status: Number(resp.statusCode) || 500,
      error: resp.message || "Bulk upload failed",
    };
  }

  return {
    ok: true,
    status: Number(resp.statusCode) || 200,
    data: {
      message: resp.data.message,
      totalRows: resp.data.totalRows,
      successful: resp.data.successful,
      failed: resp.data.failed,
      results: resp.data.results.map((r) => ({
        row: r.row,
        success: r.success,
        message: r.message,
        claimId: r.claimId,
      })),
    },
  };
}

/**
 * Parsed bulk request: a multipart CSV (`text: null` = no `file` field) or a JSON body
 * (`{items: [...]}`; {@link INVALID_JSON_BODY} when unparsable).
 */
export type BulkUploadInput = { type: "csv"; text: string | null } | { type: "json"; body: unknown };

/**
 * Read a bulk-upload `Request` (standard Fetch API): `multipart/form-data` with a `file`
 * field, otherwise JSON.
 */
export async function readBulkUploadInput(request: Request): Promise<BulkUploadInput> {
  const contentType = request.headers.get("content-type") || "";
  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    const file = form.get("file");
    if (file == null || typeof file === "string") return { type: "csv", text: null };
    return { type: "csv", text: await file.text() };
  }
  try {
    return { type: "json", body: await request.json() };
  } catch {
    return { type: "json", body: INVALID_JSON_BODY };
  }
}

async function bulkUpload(
  sdk: OpenIMISDevApiSdk,
  kind: BulkCsvKind,
  hfCode: string,
  input: BulkUploadInput
): Promise<EnvelopeResult<BulkClaimUploadResultDto>> {
  let csv = "";

  if (input.type === "csv") {
    if (input.text == null) return apiFail(400, "CSV file is required (field name: file).");
    const rewritten = rewriteBulkCsvForKind(input.text, kind, hfCode);
    if (!rewritten.csv || rewritten.issues.length > 0) {
      return apiFail(400, describeBulkCsvIssues(rewritten.issues) || "Invalid CSV.");
    }
    csv = rewritten.csv;
  } else {
    if (input.body === INVALID_JSON_BODY) return apiFail(400, "Invalid JSON body.");
    const body = input.body;
    const itemsRaw =
      body && typeof body === "object" && Array.isArray((body as { items?: unknown }).items)
        ? (body as { items: unknown[] }).items
        : null;
    if (!itemsRaw?.length) return apiFail(400, "Provide a non-empty items array or a CSV file.");
    const items: ClaimBulkRowInput[] = [];
    for (const row of itemsRaw) {
      if (!isBulkRow(row)) {
        return apiFail(400, "Each item must include patientChfId, dateFrom, and primaryDiagnosisCode.");
      }
      if (!row.serviceCode?.trim() && !row.itemCode?.trim()) {
        return apiFail(400, "Each item needs a serviceCode and/or itemCode.");
      }
      items.push(row);
    }
    if (!hfCode && items.some((i) => !i.healthFacilityCode?.trim())) {
      return apiFail(400, "Health facility code is required.");
    }
    csv = buildBulkCsv(items, kind, hfCode);
  }

  const upstream = await postBulkEncountersCsv(
    sdk,
    csv,
    kind === "claim" ? "claims-bulk.csv" : "encounters-bulk.csv"
  );
  if (!upstream.ok || !upstream.data) {
    return apiFail(upstream.status || 400, upstream.error || "Bulk upload failed.");
  }
  return apiOk(upstream.data);
}

/** The signed-in user's facility code (empty when not linked). */
export function sessionFacilityCode(user: { healthFacility?: { code?: string } | null }): string {
  return user.healthFacility?.code?.trim() || "";
}

/** POST /api/claims/bulk — `hfCode` = {@link sessionFacilityCode}(session.user) */
export const handleClaimsBulk = (sdk: OpenIMISDevApiSdk, hfCode: string, input: BulkUploadInput) =>
  bulkUpload(sdk, "claim", hfCode, input);

/** POST /api/encounters/bulk */
export const handleEncountersBulk = (sdk: OpenIMISDevApiSdk, hfCode: string, input: BulkUploadInput) =>
  bulkUpload(sdk, "encounter", hfCode, input);
