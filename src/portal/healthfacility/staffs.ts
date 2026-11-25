import type OpenIMISDevApiSdk from "../../index";
import type { HfStaffModel } from "../../models/staff";
import { fromApiResponse, httpStatus, type BackendResult } from "../common/backend";
import { apiFail, apiOk } from "../common/envelope";
import type { EnvelopeResult } from "../common/envelope";
import { HF_PORTAL_PERMISSIONS, hasPermission } from "../../auth/permissions";
import { jsonBodyOrEmpty } from "./request";
import type { StaffListItem } from "./types";
import { createStaffSchema, updateStaffSchema, validateWith } from "./validation";

export function mapStaffModel(model: HfStaffModel): StaffListItem {
  return {
    id: model.id,
    username: model.username ?? "",
    displayName: model.displayName ?? "",
    role: model.role ?? "",
    active: model.active ?? false,
    email: model.email,
  };
}

function failed<T>(result: BackendResult<unknown>): BackendResult<T> {
  return { ok: false, status: result.status, message: result.message, data: null, raw: result.raw };
}

export async function listStaffs(sdk: OpenIMISDevApiSdk): Promise<BackendResult<StaffListItem[]>> {
  const result = fromApiResponse(await sdk.healthFacility.staffs.list());
  if (!result.ok || !result.data) return failed(result);
  return { ...result, data: result.data.items.map(mapStaffModel) };
}

export async function getStaff(sdk: OpenIMISDevApiSdk, id: string): Promise<BackendResult<StaffListItem>> {
  const result = fromApiResponse(await sdk.healthFacility.staffs.get(id));
  if (!result.ok || !result.data) return failed(result);
  return { ...result, data: mapStaffModel(result.data) };
}

export async function createStaff(
  sdk: OpenIMISDevApiSdk,
  payload: {
    username: string;
    email: string;
    password: string;
    other_names?: string;
    last_name?: string;
    role?: string;
  }
): Promise<BackendResult<StaffListItem>> {
  const result = fromApiResponse(await sdk.healthFacility.staffs.create(payload));
  if (!result.ok || !result.data) return failed(result);
  return { ...result, data: mapStaffModel(result.data) };
}

export async function patchStaff(
  sdk: OpenIMISDevApiSdk,
  id: string,
  payload: { role?: string; active?: boolean }
): Promise<BackendResult<StaffListItem>> {
  const result = fromApiResponse(await sdk.healthFacility.staffs.update(id, payload));
  if (!result.ok || !result.data) return failed(result);
  return { ...result, data: mapStaffModel(result.data) };
}

// ---- API route handlers ----

const FORBIDDEN = "You do not have permission to manage staff.";

function canManageStaff(user: { permissions?: readonly string[] | null } | null | undefined): boolean {
  return hasPermission(user, HF_PORTAL_PERMISSIONS.manageStaff);
}

/** GET /api/staffs — 403 unless the user has `manage_hf_staff`. */
export async function handleStaffsList(
  sdk: OpenIMISDevApiSdk,
  user: { permissions?: readonly string[] | null }
): Promise<EnvelopeResult<StaffListItem[]>> {
  if (!canManageStaff(user)) return apiFail(403, FORBIDDEN);
  const result = await listStaffs(sdk);
  if (!result.ok || !result.data) return apiFail(httpStatus(result, 502), result.message);
  return apiOk(result.data);
}

/** POST /api/staffs → 201 */
export async function handleStaffCreate(
  sdk: OpenIMISDevApiSdk,
  user: { permissions?: readonly string[] | null },
  body: unknown
): Promise<EnvelopeResult<StaffListItem>> {
  if (!canManageStaff(user)) return apiFail(403, FORBIDDEN);
  const parsed = validateWith(createStaffSchema, jsonBodyOrEmpty(body), "Invalid staff payload");
  if (!parsed.success) return apiFail(400, parsed.message);
  const result = await createStaff(sdk, parsed.data);
  if (!result.ok || !result.data) return apiFail(httpStatus(result, 400), result.message);
  return apiOk(result.data, 201);
}

/** PATCH /api/staffs?id=… — body `{role, active}` */
export async function handleStaffUpdate(
  sdk: OpenIMISDevApiSdk,
  user: { permissions?: readonly string[] | null },
  id: string | null | undefined,
  body: unknown
): Promise<EnvelopeResult<StaffListItem>> {
  if (!canManageStaff(user)) return apiFail(403, FORBIDDEN);
  if (!id) return apiFail(400, "Staff id is required");
  const parsed = validateWith(updateStaffSchema, jsonBodyOrEmpty(body), "Invalid staff update payload");
  if (!parsed.success) return apiFail(400, parsed.message);
  const result = await patchStaff(sdk, id, { role: parsed.data.role, active: parsed.data.active });
  if (!result.ok || !result.data) return apiFail(httpStatus(result, 400), result.message);
  return apiOk(result.data);
}

// ---- page-level helpers (staff list / detail / forms) ----

export type StaffFormResult<T = unknown> =
  | { ok: true; data: T }
  | {
      ok: false;
      status: number;
      /** Per-field messages for form validation failures. */
      errors?: Record<string, string | undefined>;
      message?: string;
    };

/** `/staffs` page load: empty list + message on failure. */
export async function loadStaffsPage(
  sdk: OpenIMISDevApiSdk
): Promise<{ staffs: StaffListItem[]; error: string | null }> {
  const result = await listStaffs(sdk);
  return { staffs: result.ok ? (result.data ?? []) : [], error: result.ok ? null : result.message };
}

/** `/staffs/[id]` page load. `status` is the HTTP error to raise (404 for unknown/0). */
export async function loadStaffPage(
  sdk: OpenIMISDevApiSdk,
  id: string
): Promise<{ ok: true; staff: StaffListItem } | { ok: false; status: number; message: string }> {
  const result = await getStaff(sdk, id);
  if (!result.ok || !result.data) {
    const status = result.status === 404 || result.status === 0 ? 404 : result.status;
    return {
      ok: false,
      status: status >= 400 && status < 600 ? status : 404,
      message: result.message || "Staff member not found",
    };
  }
  return { ok: true, staff: result.data };
}

/** Create-staff form: `values` as submitted (blank optional fields as undefined). */
export async function submitCreateStaff(
  sdk: OpenIMISDevApiSdk,
  values: Record<string, unknown>
): Promise<StaffFormResult<StaffListItem>> {
  const parsed = validateWith(createStaffSchema, values);
  if (!parsed.success) return { ok: false, status: 400, errors: parsed.fieldErrors };
  const result = await createStaff(sdk, parsed.data);
  if (!result.ok || !result.data) {
    return { ok: false, status: httpStatus(result, 400), message: result.message };
  }
  return { ok: true, data: result.data };
}

/** Update-staff form (`role`, `active` as "true"/"on"/"1"). */
export async function submitUpdateStaff(
  sdk: OpenIMISDevApiSdk,
  id: string,
  values: Record<string, unknown>
): Promise<StaffFormResult<StaffListItem>> {
  const parsed = validateWith(updateStaffSchema, values);
  if (!parsed.success) return { ok: false, status: 400, errors: parsed.fieldErrors };
  const result = await patchStaff(sdk, id, { role: parsed.data.role, active: parsed.data.active });
  if (!result.ok || !result.data) {
    return { ok: false, status: httpStatus(result, 400), message: result.message };
  }
  return { ok: true, data: result.data };
}
