import type { OpenIMISDevApiSdk } from "../../index";
import { FhirListParams } from "../../formalsector/types";
import { toUserFacingApiError } from "../common/user_facing_error";
import type { StaffDto } from "./dto";
import { httpStatus } from "./envelope";
import { formValue, parseCreateStaff, parseUpdateStaff, STAFF_ROLE_OPTIONS } from "./forms";
import type { FieldErrors, FormInput } from "./forms";
import { serializeStaff } from "./serialize";

type Sdk = OpenIMISDevApiSdk;

const STAFF_PAGE_SIZE = 100;

export type StaffListPage = { staffs: StaffDto[]; roles: string[]; error: string | null };

/** `/staffs` page data. */
export async function loadStaffList(sdk: Sdk): Promise<StaffListPage> {
  const resp = await sdk.formalSector.staffs.list(new FhirListParams(undefined, STAFF_PAGE_SIZE));
  return {
    staffs: resp.success && resp.data ? resp.data.items.map(serializeStaff) : [],
    roles: STAFF_ROLE_OPTIONS,
    error: resp.success ? null : toUserFacingApiError(resp.statusCode, resp.message),
  };
}

export type StaffDetailPage =
  | { ok: true; staff: StaffDto; roles: string[] }
  | { ok: false; status: number; message: string };

/** `/staffs/[id]` page data (a failure is a 404 / error page). */
export async function loadStaffDetail(sdk: Sdk, id: string): Promise<StaffDetailPage> {
  const resp = await sdk.formalSector.staffs.get(id);
  if (!resp.success || !resp.data) {
    const raw = Number(resp.statusCode) || 0;
    const status = raw === 0 ? 404 : httpStatus(raw, 404);
    return {
      ok: false,
      status,
      message: status === 404 ? "Staff member not found." : toUserFacingApiError(raw, resp.message),
    };
  }
  return { ok: true, staff: serializeStaff(resp.data), roles: STAFF_ROLE_OPTIONS };
}

export type StaffActionFailure = {
  ok: false;
  status: number;
  values: Record<string, string | undefined>;
  errors?: FieldErrors;
  message?: string;
};

/** Create-staff form (`username`, `email`, `password`, `other_names`, `last_name`, `role`). */
export async function createStaffAction(
  sdk: Sdk,
  form: FormInput
): Promise<{ ok: true; created: true; username: string } | StaffActionFailure> {
  const values = {
    username: formValue(form, "username"),
    email: formValue(form, "email"),
    password: "",
    other_names: formValue(form, "other_names") || undefined,
    last_name: formValue(form, "last_name") || undefined,
    role: formValue(form, "role") || "STAFF",
  };
  const parsed = parseCreateStaff(form);
  if (!parsed.ok) return { ok: false, status: 400, values, errors: parsed.errors };
  const resp = await sdk.formalSector.staffs.create(parsed.data);
  if (!resp.success) {
    const status = Number(resp.statusCode) || 0;
    return { ok: false, status: httpStatus(status), values, message: toUserFacingApiError(status, resp.message) };
  }
  return { ok: true, created: true, username: parsed.data.username };
}

/** Update-staff form (`role`, `active`). */
export async function updateStaffAction(
  sdk: Sdk,
  id: string,
  form: FormInput
): Promise<{ ok: true; updated: true; staff: StaffDto | null } | StaffActionFailure> {
  const values = { role: formValue(form, "role"), active: formValue(form, "active") || "false" };
  const parsed = parseUpdateStaff({ role: values.role, active: values.active });
  if (!parsed.ok) return { ok: false, status: 400, values, errors: parsed.errors };
  const resp = await sdk.formalSector.staffs.update(id, {
    role: parsed.data.role,
    is_active: parsed.data.active,
  });
  if (!resp.success) {
    const status = Number(resp.statusCode) || 0;
    return { ok: false, status: httpStatus(status), values, message: toUserFacingApiError(status, resp.message) };
  }
  return { ok: true, updated: true, staff: resp.data ? serializeStaff(resp.data) : null };
}
