import type OpenIMISDevApiSdk from "../../index";
import { PreauthorizationListFilters } from "../../healthfacility/types";
import type { BulkPreauthorizationResult } from "../../healthfacility/preauthorization_ops";
import { DiagnosisCode, PreauthorizationModel } from "../../models/preauthorization";
import { apiFail, apiOk, fromSdkResponse, parseFhirPageOffset, parsePositiveInt, sdkFail } from "../common/envelope";
import { INVALID_JSON_BODY, type SearchParamsLike } from "./request";
import { serializePreauth, serializeSearchPage } from "./serialize";
import type { BulkPreauthResultDto, PreauthListItemDto, SearchPageDto } from "./types";

export type PreauthWriteBody = {
  patientChfId?: string;
  patientName?: string;
  hfToId?: string;
  hfToDisplay?: string;
  primaryDiagnosisCode?: string;
  primaryDiagnosisName?: string;
  serviceCode?: string;
  serviceName?: string;
  explanation?: string;
  status?: string;
  id?: string;
  uuid?: string;
};

export function isPreauthWriteBody(value: unknown): value is PreauthWriteBody {
  return !!value && typeof value === "object";
}

export function preauthModelFromBody(body: PreauthWriteBody): PreauthorizationModel {
  const patientChfId = String(body.patientChfId ?? "").trim();
  const hfToId = String(body.hfToId ?? "").trim();
  const dxCode = String(body.primaryDiagnosisCode ?? "").trim();
  const svcCode = String(body.serviceCode ?? "").trim();

  return new PreauthorizationModel(
    String(body.id ?? body.uuid ?? ""),
    body.status || "Entered",
    patientChfId,
    body.uuid,
    undefined,
    body.patientName?.trim() || undefined,
    undefined,
    undefined,
    hfToId || undefined,
    body.hfToDisplay?.trim() || undefined,
    dxCode ? new DiagnosisCode(dxCode, body.primaryDiagnosisName) : undefined,
    undefined,
    undefined,
    undefined,
    svcCode ? new DiagnosisCode(svcCode, body.serviceName) : undefined,
    undefined,
    undefined,
    body.explanation?.trim() || undefined
  );
}

export function serializeBulkPreauthResult(result: BulkPreauthorizationResult): BulkPreauthResultDto {
  return {
    message: result.message,
    created: result.created.map(serializePreauth),
    errors: result.errors.map((e) => ({ index: e.index, message: e.message })),
  };
}

/** GET /api/preauthorizations — `?identifier=` returns a one-item page; else filters + paging. */
export async function handlePreauthorizationsList(sdk: OpenIMISDevApiSdk, params: SearchParamsLike) {
  const identifier = params.get("identifier")?.trim();
  if (identifier) {
    const resp = await sdk.healthFacility.preauthorizations.get(identifier);
    return fromSdkResponse(
      resp,
      (item): SearchPageDto<PreauthListItemDto> => ({
        total: 1,
        items: [serializePreauth(item)],
        hasNext: false,
        hasPrevious: false,
      }),
      "Pre-authorization not found."
    );
  }

  const dateFrom = params.get("dateFrom")?.trim() || params.get("refDate")?.trim() || undefined;
  const dateTo = params.get("dateTo")?.trim() || undefined;
  const filters = new PreauthorizationListFilters(
    parseFhirPageOffset(params.get("page-offset")),
    parsePositiveInt(params.get("_count"), 20, 50),
    undefined,
    params.get("order_by") ?? "-validity_from",
    params.get("patient") ?? undefined,
    params.get("patientCHFID") ?? undefined,
    dateFrom,
    params.get("status") ?? undefined,
    undefined,
    dateTo
  );
  const resp = await sdk.healthFacility.preauthorizations.list(filters);
  return fromSdkResponse(resp, (page) => serializeSearchPage(page, serializePreauth));
}

/** POST /api/preauthorizations → 201 */
export async function handlePreauthorizationCreate(sdk: OpenIMISDevApiSdk, body: unknown) {
  if (body === INVALID_JSON_BODY) return apiFail(400, "Invalid JSON body.");
  if (!isPreauthWriteBody(body)) return apiFail(400, "Invalid preauthorization payload.");
  const resp = await sdk.healthFacility.preauthorizations.create(preauthModelFromBody(body));
  if (!resp.success || resp.data == null) return sdkFail(resp, 400);
  return apiOk(serializePreauth(resp.data), 201);
}

/** GET /api/preauthorizations/[id] */
export async function handlePreauthorizationGet(sdk: OpenIMISDevApiSdk, rawId: string | undefined) {
  const id = rawId?.trim();
  if (!id) return apiFail(400, "Pre-authorization id is required.");
  const resp = await sdk.healthFacility.preauthorizations.get(id);
  return fromSdkResponse(resp, serializePreauth, "Pre-authorization not found.");
}

/** PUT /api/preauthorizations/[id] */
export async function handlePreauthorizationUpdate(
  sdk: OpenIMISDevApiSdk,
  rawId: string | undefined,
  body: unknown
) {
  const id = rawId?.trim();
  if (!id) return apiFail(400, "Pre-authorization id is required.");
  if (body === INVALID_JSON_BODY) return apiFail(400, "Invalid JSON body.");
  if (!isPreauthWriteBody(body)) return apiFail(400, "Invalid preauthorization payload.");

  const model = preauthModelFromBody({ ...body, uuid: body.uuid ?? id, id: body.id ?? id });
  const resp = await sdk.healthFacility.preauthorizations.update(id, model);
  if (!resp.success || resp.data == null) return sdkFail(resp, 400);
  return apiOk(serializePreauth(resp.data));
}

/** POST /api/preauthorizations/bulk — body `{items: [...]}` or a bare array. */
export async function handlePreauthorizationsBulk(sdk: OpenIMISDevApiSdk, body: unknown) {
  if (body === INVALID_JSON_BODY) return apiFail(400, "Invalid JSON body.");
  const itemsRaw =
    body && typeof body === "object" && Array.isArray((body as { items?: unknown }).items)
      ? (body as { items: unknown[] }).items
      : Array.isArray(body)
        ? body
        : null;
  if (!itemsRaw || itemsRaw.length === 0) return apiFail(400, "Provide a non-empty items array.");

  const items: PreauthWriteBody[] = [];
  for (const row of itemsRaw) {
    if (!isPreauthWriteBody(row)) return apiFail(400, "Each item must be a preauthorization object.");
    items.push(row);
  }

  const resp = await sdk.healthFacility.preauthorizations.bulkCreate(items.map(preauthModelFromBody));
  if (!resp.success || resp.data == null) return sdkFail(resp, 400);
  // Always structured per-row results (including client validation errors).
  return apiOk(serializeBulkPreauthResult(resp.data));
}
