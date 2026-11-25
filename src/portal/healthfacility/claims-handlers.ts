import type OpenIMISDevApiSdk from "../../index";
import { ClaimListFilters, EncounterListFilters } from "../../healthfacility/types";
import type { ClaimModel } from "../../models/claim";
import type { ApiResponse } from "../../api_response";
import { apiFail, apiOk, fromSdkResponse, parseFhirPageOffset, parsePositiveInt, sdkFail } from "../common/envelope";
import type { EnvelopeResult } from "../common/envelope";
import { enrichClaimsWithPatientNames } from "./claim-enrich";
import {
  claimModelFromBody,
  isClaimEditableStatus,
  isClaimWriteBody,
  loadClaimsForSubmit,
  parseSubmitIds,
} from "./claim-model";
import { INVALID_JSON_BODY, type SearchParamsLike } from "./request";
import { serializeClaim, serializeSearchPage } from "./serialize";
import type { ClaimListItemDto, SearchPageDto } from "./types";

export type ClaimLikeKind = "claim" | "encounter";

type Adapter = {
  noun: "Claim" | "Encounter";
  plural: "claims" | "encounters";
  list(params: SearchParamsLike): Promise<ApiResponse<import("../../models/pagination").FhirSearchPage<ClaimModel>>>;
  get(id: string): Promise<ApiResponse<ClaimModel>>;
  create(model: ClaimModel): Promise<ApiResponse<ClaimModel>>;
  update(id: string, model: ClaimModel): Promise<ApiResponse<ClaimModel>>;
  submit(models: ClaimModel[]): Promise<ApiResponse<{ message: string }>>;
  /** Visit type forced on create/update (`undefined` = body value / default). */
  forcedUpdateVisitType?: string;
};

function dateRange(params: SearchParamsLike) {
  return {
    dateFrom: params.get("dateFrom")?.trim() || params.get("refDate")?.trim() || undefined,
    dateTo: params.get("dateTo")?.trim() || undefined,
  };
}

function adapter(sdk: OpenIMISDevApiSdk, kind: ClaimLikeKind): Adapter {
  if (kind === "claim") {
    const c = sdk.healthFacility.claims;
    return {
      noun: "Claim",
      plural: "claims",
      list: (p) => {
        const { dateFrom, dateTo } = dateRange(p);
        return c.list(
          new ClaimListFilters(
            parseFhirPageOffset(p.get("page-offset")),
            parsePositiveInt(p.get("_count"), 20, 50),
            p.get("identifier") ?? undefined,
            dateFrom,
            p.get("patient") ?? undefined,
            p.get("patientChfid") ?? undefined,
            p.get("status") ?? undefined,
            undefined,
            dateTo
          )
        );
      },
      get: (id) => c.get(id),
      create: (m) => c.create(m),
      update: (id, m) => c.update(id, m),
      submit: (ms) => c.submit(ms),
    };
  }
  const e = sdk.healthFacility.encounters;
  return {
    noun: "Encounter",
    plural: "encounters",
    list: (p) => {
      const { dateFrom, dateTo } = dateRange(p);
      return e.list(
        new EncounterListFilters(
          parseFhirPageOffset(p.get("page-offset")),
          parsePositiveInt(p.get("_count"), 20, 50),
          p.get("identifier") ?? undefined,
          dateFrom,
          p.get("patient") ?? undefined,
          p.get("patientChfid") ?? undefined,
          p.get("status") ?? undefined,
          undefined,
          undefined,
          dateTo
        )
      );
    },
    get: (id) => e.get(id),
    create: (m) => e.create(m),
    update: (id, m) => e.update(id, m),
    submit: (ms) => e.bulkSubmit(ms),
    // Encounters are forced to visit type C by the backend serializer.
    forcedUpdateVisitType: "C",
  };
}

function idError(a: Adapter): EnvelopeResult<never> {
  return apiFail(400, `${a.noun} id is required.`);
}

async function list(sdk: OpenIMISDevApiSdk, kind: ClaimLikeKind, params: SearchParamsLike) {
  const a = adapter(sdk, kind);
  const resp = await a.list(params);
  if (!resp.success || resp.data == null) return sdkFail(resp, 502);
  const page: SearchPageDto<ClaimListItemDto> = serializeSearchPage(resp.data, serializeClaim);
  page.items = await enrichClaimsWithPatientNames(sdk, page.items);
  return apiOk(page);
}

async function create(sdk: OpenIMISDevApiSdk, kind: ClaimLikeKind, body: unknown) {
  const a = adapter(sdk, kind);
  if (body === INVALID_JSON_BODY) return apiFail(400, "Invalid JSON body.");
  if (!isClaimWriteBody(body)) return apiFail(400, `Invalid ${a.noun.toLowerCase()} payload.`);

  const patientChfId = String(body.patientChfId ?? "").trim();
  const dateFrom = String(body.dateFrom ?? "").trim();
  const diagnoses = Array.isArray(body.diagnoses) ? body.diagnoses : [];
  const primaryCode = String(diagnoses[0]?.code ?? "").trim();
  if (!patientChfId || !dateFrom || !primaryCode) {
    return apiFail(400, "Patient, date from, and primary diagnosis are required.");
  }

  const visitType =
    kind === "encounter" ? "C" : String(body.visitType ?? "O").trim() || "O";
  const model = claimModelFromBody({
    ...body,
    patientChfId,
    dateFrom,
    status: "ENTERED",
    visitType,
    total: 0,
  });

  const resp = await a.create(model);
  if (!resp.success || resp.data == null) return sdkFail(resp, 400);
  return apiOk(serializeClaim(resp.data), 201);
}

async function getOne(sdk: OpenIMISDevApiSdk, kind: ClaimLikeKind, rawId: string | undefined) {
  const a = adapter(sdk, kind);
  const id = rawId?.trim();
  if (!id) return idError(a);
  return fromSdkResponse(await a.get(id), serializeClaim, `${a.noun} not found.`);
}

async function update(sdk: OpenIMISDevApiSdk, kind: ClaimLikeKind, rawId: string | undefined, body: unknown) {
  const a = adapter(sdk, kind);
  const id = rawId?.trim();
  if (!id) return idError(a);
  if (body === INVALID_JSON_BODY) return apiFail(400, "Invalid JSON body.");
  if (!isClaimWriteBody(body)) return apiFail(400, `Invalid ${a.noun.toLowerCase()} payload.`);

  const existing = await a.get(id);
  if (!existing.success || existing.data == null) return apiFail(404, `${a.noun} not found.`);
  if (!isClaimEditableStatus(String(existing.data.status))) {
    return apiFail(400, `Only entered or rejected ${a.plural} can be edited.`);
  }

  const model = claimModelFromBody({
    ...body,
    id: body.id ?? existing.data.id,
    code: body.code ?? existing.data.code,
    uuid: body.uuid ?? existing.data.uuid ?? id,
    patientChfId: body.patientChfId ?? existing.data.patientChfId,
    status: body.status ?? existing.data.status,
    providerId: body.providerId ?? existing.data.providerId,
    ...(a.forcedUpdateVisitType ? { visitType: a.forcedUpdateVisitType } : {}),
  });

  const resp = await a.update(id, model);
  if (!resp.success || resp.data == null) return sdkFail(resp, 400);
  return apiOk(serializeClaim(resp.data));
}

async function submit(sdk: OpenIMISDevApiSdk, kind: ClaimLikeKind, body: unknown) {
  const a = adapter(sdk, kind);
  if (body === INVALID_JSON_BODY) return apiFail(400, "Invalid JSON body.");
  const ids = parseSubmitIds(body);
  if (!ids) return apiFail(400, "Provide a non-empty ids array.");

  const loaded = await loadClaimsForSubmit((id) => a.get(id), ids);
  if ("error" in loaded) return apiFail(loaded.status, loaded.error);

  const resp = await a.submit(loaded.claims);
  if (!resp.success || resp.data == null) return sdkFail(resp, 400);
  return apiOk({ message: resp.data.message, count: ids.length });
}

export type SubmitResultDto = { message: string; count: number };

/** GET /api/claims — filters: dateFrom|refDate, dateTo, identifier, patient, patientChfid, status, page-offset, _count */
export const handleClaimsList = (sdk: OpenIMISDevApiSdk, params: SearchParamsLike) => list(sdk, "claim", params);
/** POST /api/claims → 201 */
export const handleClaimCreate = (sdk: OpenIMISDevApiSdk, body: unknown) => create(sdk, "claim", body);
/** GET /api/claims/[id] */
export const handleClaimGet = (sdk: OpenIMISDevApiSdk, id: string | undefined) => getOne(sdk, "claim", id);
/** PUT /api/claims/[id] */
export const handleClaimUpdate = (sdk: OpenIMISDevApiSdk, id: string | undefined, body: unknown) =>
  update(sdk, "claim", id, body);
/** POST /api/claims/submit — body `{ids: string[]}` */
export const handleClaimsSubmit = (sdk: OpenIMISDevApiSdk, body: unknown) => submit(sdk, "claim", body);

/** GET /api/encounters */
export const handleEncountersList = (sdk: OpenIMISDevApiSdk, params: SearchParamsLike) => list(sdk, "encounter", params);
/** POST /api/encounters → 201 */
export const handleEncounterCreate = (sdk: OpenIMISDevApiSdk, body: unknown) => create(sdk, "encounter", body);
/** GET /api/encounters/[id] */
export const handleEncounterGet = (sdk: OpenIMISDevApiSdk, id: string | undefined) => getOne(sdk, "encounter", id);
/** PUT /api/encounters/[id] */
export const handleEncounterUpdate = (sdk: OpenIMISDevApiSdk, id: string | undefined, body: unknown) =>
  update(sdk, "encounter", id, body);
/** POST /api/encounters/submit — body `{ids: string[]}` */
export const handleEncountersSubmit = (sdk: OpenIMISDevApiSdk, body: unknown) => submit(sdk, "encounter", body);
