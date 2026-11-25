import type OpenIMISDevApiSdk from "../../index";
import { isOpenEnrollmentStatus, toEnrollmentSubmissions } from "../../enrollment/enrollment_ops";
import type { EnrollmentLegalForm, EnrollmentLocation } from "../../models/enrollment_metadata";
import { fromApiResponse, httpStatus, type BackendResult } from "../common/backend";
import { apiFail, apiOk } from "../common/envelope";
import type { EnvelopeResult } from "../common/envelope";
import { jsonBodyOrEmpty } from "./request";
import type { EnrollmentListItem } from "./types";
import { accountClaimSchema, enrollmentRegisterSchema, validateWith } from "./validation";

/** Plain (serialisable) shapes of the SDK metadata classes. */
type Plain<T> = { [K in keyof T as T[K] extends (...args: never[]) => unknown ? never : K]: T[K] };
export type EnrollmentLocationData = Plain<EnrollmentLocation>;
export type EnrollmentLegalFormData = Plain<EnrollmentLegalForm>;

export const OPEN_ENROLLMENT_MESSAGE =
  "You already have an open facility submission. Wait for it to be reviewed before submitting another.";

/** Registrations + account claims of the applicant (a failing list contributes nothing). */
export async function listHfEnrollments(sdk: OpenIMISDevApiSdk): Promise<EnrollmentListItem[]> {
  const client = sdk.enrollment.healthFacility;
  const items: EnrollmentListItem[] = [];

  const regResp = await client.listRegistrations();
  if (regResp.success) {
    for (const s of toEnrollmentSubmissions(regResp.data, "registration", "facility_data", ["code", "facility_code"], ["name", "facility_name"])) {
      items.push({
        uuid: s.uuid,
        status: s.status,
        kind: "registration",
        summary: [s.code, s.name].filter(Boolean).join(" — ") || s.uuid || "Registration",
        dateCreated: s.dateCreated,
      });
    }
  }

  const claimResp = await client.listAccountClaims();
  if (claimResp.success) {
    for (const s of toEnrollmentSubmissions(claimResp.data, "account_claim", "claim_data", ["facility_code", "code"])) {
      items.push({
        uuid: s.uuid,
        status: s.status,
        kind: "account_claim",
        summary: s.code ? `Claim: ${s.code}` : `Claim ${s.uuid}`.trim(),
        dateCreated: s.dateCreated,
      });
    }
  }
  return items;
}

/** Submissions still awaiting a decision (DRAFT / PENDING / IN_REVIEW). */
export function openSubmissions(items: readonly EnrollmentListItem[]): EnrollmentListItem[] {
  return items.filter((item) => isOpenEnrollmentStatus(item.status));
}

export async function hasOpenSubmission(sdk: OpenIMISDevApiSdk): Promise<boolean> {
  return openSubmissions(await listHfEnrollments(sdk)).length > 0;
}

/** Pull uuid from EnrollmentRecord, nested service envelope, or plain object. */
export function extractEnrollmentUuid(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const obj = payload as Record<string, unknown>;
  const direct = obj.uuid ?? obj.id;
  if (typeof direct === "string" && direct.trim()) return direct.trim();
  if (obj.data && typeof obj.data === "object" && !Array.isArray(obj.data)) {
    const nested = obj.data as Record<string, unknown>;
    const nestedUuid = nested.uuid ?? nested.id;
    if (typeof nestedUuid === "string" && nestedUuid.trim()) return nestedUuid.trim();
  }
  return null;
}

/** Register a facility, then submit it for review. */
export async function registerAndSubmitHf(
  sdk: OpenIMISDevApiSdk,
  facilityData: Record<string, unknown>,
  notes?: string
): Promise<BackendResult> {
  const client = sdk.enrollment.healthFacility;
  const created = fromApiResponse(
    await client.register({
      facility_data: facilityData,
      notes: notes ?? "",
      submitted_by_type: "SELF",
      self_enrollemnt_type: "HEALTH_FACILITY",
    })
  );
  if (!created.ok) return created;

  const uuid = extractEnrollmentUuid(created.data ?? created.raw);
  if (!uuid) {
    return {
      ok: false,
      status: 502,
      message: "Registration created but no uuid returned.",
      data: created.data,
      raw: created.raw,
    };
  }
  return fromApiResponse(await client.submit(uuid));
}

export async function claimHfAccount(
  sdk: OpenIMISDevApiSdk,
  input: { facility_code: string; notes?: string }
): Promise<BackendResult> {
  return fromApiResponse(
    await sdk.enrollment.healthFacility.accountClaim({
      facility_code: input.facility_code,
      notes: input.notes ?? "",
      auto_submit: true,
    })
  );
}

export async function listEnrollmentLocations(
  sdk: OpenIMISDevApiSdk,
  opts: { type?: string; parentId?: number } = {}
): Promise<EnrollmentLocationData[]> {
  const resp = await sdk.enrollment.metadata.listLocations(opts);
  if (!resp.success || !resp.data) return [];
  return resp.data.map((l) => ({ ...l }));
}

export async function listEnrollmentLegalForms(sdk: OpenIMISDevApiSdk): Promise<EnrollmentLegalFormData[]> {
  const resp = await sdk.enrollment.metadata.listHealthFacilityLegalForms();
  if (!resp.success || !resp.data) return [];
  return resp.data.map((f) => ({ ...f }));
}

/** Form values → `facility_data` (empty optionals dropped). */
export function buildFacilityData(parsed: {
  name: string;
  level: string;
  location_id: string;
  care_type: string;
  legal_form_id?: string;
  address?: string;
  phone?: string;
  email?: string;
}): Record<string, unknown> {
  const { address, phone, email, legal_form_id, ...required } = parsed;
  const facilityData: Record<string, unknown> = { ...required };
  if (legal_form_id) facilityData.legal_form_id = legal_form_id;
  if (address) facilityData.address = address;
  if (phone) facilityData.phone = phone;
  if (email) facilityData.email = email;
  return facilityData;
}

// ---- API route handlers ----

/** GET /api/enrollment/health-facility */
export async function handleEnrollmentList(sdk: OpenIMISDevApiSdk): Promise<EnvelopeResult<EnrollmentListItem[]>> {
  try {
    return apiOk(await listHfEnrollments(sdk));
  } catch (e) {
    return apiFail(502, e instanceof Error ? e.message : "Failed to list enrollments");
  }
}

/** POST /api/enrollment/health-facility → 201 */
export async function handleEnrollmentRegister(sdk: OpenIMISDevApiSdk, body: unknown): Promise<EnvelopeResult<unknown>> {
  const parsed = validateWith(enrollmentRegisterSchema, jsonBodyOrEmpty(body), "Invalid facility payload");
  if (!parsed.success) return apiFail(400, parsed.message);
  const result = await registerAndSubmitHf(sdk, buildFacilityData(parsed.data));
  if (!result.ok) return apiFail(httpStatus(result, 400), result.message);
  return apiOk(result.data ?? result.raw, 201);
}

/** POST /api/enrollment/health-facility/account-claim → 201 */
export async function handleAccountClaim(sdk: OpenIMISDevApiSdk, body: unknown): Promise<EnvelopeResult<unknown>> {
  const parsed = validateWith(accountClaimSchema, jsonBodyOrEmpty(body), "Invalid claim payload");
  if (!parsed.success) return apiFail(400, parsed.message);
  const result = await claimHfAccount(sdk, parsed.data);
  if (!result.ok) return apiFail(httpStatus(result, 400), result.message);
  return apiOk(result.data ?? result.raw, 201);
}

// ---- page-level helpers ----

/** `/enrollment` page load. */
export async function loadEnrollmentStatus(sdk: OpenIMISDevApiSdk): Promise<{
  pending: EnrollmentListItem[];
  hasOpenSubmission: boolean;
  error: string | null;
}> {
  let all: EnrollmentListItem[] = [];
  let error: string | null = null;
  try {
    all = await listHfEnrollments(sdk);
  } catch (e) {
    error = e instanceof Error ? e.message : "Could not load enrollment status.";
  }
  const pending = openSubmissions(all);
  return { pending, hasOpenSubmission: pending.length > 0, error };
}

/** `/enrollment/register` page load: regions, districts and legal forms for the selects. */
export async function loadEnrollmentRegisterData(sdk: OpenIMISDevApiSdk): Promise<
  | { blocked: true }
  | {
      blocked: false;
      regions: EnrollmentLocationData[];
      districts: EnrollmentLocationData[];
      legalForms: EnrollmentLegalFormData[];
    }
> {
  if (await hasOpenSubmission(sdk)) return { blocked: true };
  const [regions, districts, legalForms] = await Promise.all([
    listEnrollmentLocations(sdk, { type: "R" }),
    listEnrollmentLocations(sdk, { type: "D" }),
    listEnrollmentLegalForms(sdk),
  ]);
  return { blocked: false, regions, districts, legalForms };
}

export type EnrollmentFormResult =
  | { ok: true }
  | { ok: false; status: number; errors?: Record<string, string | undefined>; message?: string };

/** Facility registration form action (blocks while another submission is open). */
export async function submitEnrollmentRegister(
  sdk: OpenIMISDevApiSdk,
  values: Record<string, unknown>
): Promise<EnrollmentFormResult> {
  if (await hasOpenSubmission(sdk)) return { ok: false, status: 400, message: OPEN_ENROLLMENT_MESSAGE };
  const parsed = validateWith(enrollmentRegisterSchema, values);
  if (!parsed.success) return { ok: false, status: 400, errors: parsed.fieldErrors };
  const result = await registerAndSubmitHf(sdk, buildFacilityData(parsed.data));
  if (!result.ok) return { ok: false, status: httpStatus(result, 400), message: result.message };
  return { ok: true };
}

/** Account-claim form action (blocks while another submission is open). */
export async function submitEnrollmentClaim(
  sdk: OpenIMISDevApiSdk,
  values: Record<string, unknown>
): Promise<EnrollmentFormResult> {
  if (await hasOpenSubmission(sdk)) return { ok: false, status: 400, message: OPEN_ENROLLMENT_MESSAGE };
  const parsed = validateWith(accountClaimSchema, values);
  if (!parsed.success) return { ok: false, status: 400, errors: parsed.fieldErrors };
  const result = await claimHfAccount(sdk, parsed.data);
  if (!result.ok) return { ok: false, status: httpStatus(result, 400), message: result.message };
  return { ok: true };
}
