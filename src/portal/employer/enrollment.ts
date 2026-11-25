import type { OpenIMISDevApiSdk } from "../../index";
import { isOpenEnrollmentStatus } from "../../enrollment/enrollment_ops";
import { toUserFacingApiError } from "../common/user_facing_error";
import type {
  EnrollmentDistrictDto,
  EnrollmentPendingDto,
  EnrollmentRegionDto,
} from "./dto";
import { httpStatus } from "./envelope";
import {
  ACCOUNT_CLAIM_FIELDS,
  ENROLLMENT_REGISTER_FIELDS,
  POLICY_HOLDER_TYPE_OPTIONS,
  TYPES_REQUIRING_REGISTRATION,
  formValues,
  parseAccountClaim,
  parseEnrollmentRegister,
} from "./forms";
import type { FormInput } from "./forms";
import type { FormFailure, RedirectResult } from "./auth";
import { fetchSessionUser } from "./auth";
import { employerPaths } from "./paths";
import type { EmployerSession, EmployerSessionUser } from "./session";

type Sdk = OpenIMISDevApiSdk;

/**
 * Employer enrollment (an applicant not yet linked to an employer). Pass an SDK built with
 * the user's token and **no** `PolicyHolder-Code`.
 */

export const OPEN_SUBMISSION_MESSAGE =
  "You already have an open employer submission. Wait for it to be reviewed before submitting another.";

/** Fails closed: if the status cannot be read, treat it as open. */
export async function hasOpenPhSubmission(sdk: Sdk): Promise<boolean> {
  const resp = await sdk.enrollment.policyHolder.hasOpenSubmission();
  return !resp.success || resp.data === true;
}

export type EnrollmentOverview = {
  pending: EnrollmentPendingDto[];
  /** Fail closed: unreadable submissions count as open. */
  hasOpenSubmission: boolean;
  error: string | null;
};

/** `/enrollment` page data. */
export async function loadEnrollmentOverview(sdk: Sdk): Promise<EnrollmentOverview> {
  const resp = await sdk.enrollment.policyHolder.listSubmissions();
  const open = (resp.data ?? []).filter((item) => isOpenEnrollmentStatus(item.status));
  return {
    pending: open.map((item) => ({
      uuid: item.uuid,
      status: item.status,
      kind: item.kind,
      summary: [item.code, item.name].filter(Boolean).join(" — ") || item.uuid,
      dateCreated: item.dateCreated,
    })),
    hasOpenSubmission: !resp.success || open.length > 0,
    error: resp.success ? null : toUserFacingApiError(resp.statusCode, resp.message),
  };
}

export type EnrollmentRegisterPage =
  | { redirectTo: string }
  | {
      regions: EnrollmentRegionDto[];
      districts: EnrollmentDistrictDto[];
      types: string[];
      typesRequiringRegistration: string[];
    };

/** `/enrollment/register` page data (redirects away when a submission is already open). */
export async function loadEnrollmentRegisterPage(sdk: Sdk): Promise<EnrollmentRegisterPage> {
  if (await hasOpenPhSubmission(sdk)) return { redirectTo: employerPaths.enrollment };
  const locations = sdk.enrollment.metadata;
  const [regions, districts] = await Promise.all([
    locations.listLocations({ type: "R" }),
    locations.listLocations({ type: "D" }),
  ]);
  // Plain objects: SDK class instances do not survive page-data serialisation cleanly.
  return {
    regions: (regions.data ?? []).map((r) => ({ id: r.id, code: r.code, name: r.name })),
    districts: (districts.data ?? []).map((d) => ({
      id: d.id,
      code: d.code,
      name: d.name,
      parentId: d.parentId,
    })),
    types: POLICY_HOLDER_TYPE_OPTIONS,
    typesRequiringRegistration: TYPES_REQUIRING_REGISTRATION,
  };
}

/** `/enrollment/claim` page: redirect when a submission is already open. */
export async function loadEnrollmentClaimPage(sdk: Sdk): Promise<{ redirectTo: string } | { ok: true }> {
  return (await hasOpenPhSubmission(sdk)) ? { redirectTo: employerPaths.enrollment } : { ok: true };
}

/** Register-an-employer form (see `ENROLLMENT_REGISTER_FIELDS`). */
export async function registerEnrollmentAction(
  sdk: Sdk,
  form: FormInput
): Promise<RedirectResult | FormFailure> {
  const values = formValues(form, ENROLLMENT_REGISTER_FIELDS);
  if (await hasOpenPhSubmission(sdk)) {
    return { ok: false, status: 400, values, message: OPEN_SUBMISSION_MESSAGE };
  }
  const parsed = parseEnrollmentRegister(form);
  if (!parsed.ok) return { ok: false, status: 400, values, errors: parsed.errors };
  // SDK re-validates, drops empty fields and resumes an existing draft for the same code.
  const resp = await sdk.enrollment.policyHolder.registerAndSubmit(parsed.data);
  if (!resp.success) {
    const status = Number(resp.statusCode) || 0;
    return {
      ok: false,
      status: httpStatus(status),
      values,
      message: toUserFacingApiError(status, resp.message),
    };
  }
  return { ok: true, redirectTo: employerPaths.enrollment };
}

/** Claim-an-existing-employer-account form (see `ACCOUNT_CLAIM_FIELDS`). */
export async function claimEnrollmentAction(
  sdk: Sdk,
  form: FormInput
): Promise<RedirectResult | FormFailure> {
  const values = formValues(form, ACCOUNT_CLAIM_FIELDS);
  if (await hasOpenPhSubmission(sdk)) {
    return { ok: false, status: 400, values, message: OPEN_SUBMISSION_MESSAGE };
  }
  const parsed = parseAccountClaim(form);
  if (!parsed.ok) return { ok: false, status: 400, values, errors: parsed.errors };
  const resp = await sdk.enrollment.policyHolder.claimAccount(parsed.data);
  if (!resp.success) {
    const status = Number(resp.statusCode) || 0;
    return {
      ok: false,
      status: httpStatus(status),
      values,
      message: toUserFacingApiError(status, resp.message),
    };
  }
  return { ok: true, redirectTo: employerPaths.enrollment };
}

/**
 * Enrollment layout: re-fetch `/user/` so an employer link granted after approval is
 * reflected. Returns the refreshed session (the caller reseals it into the cookie,
 * tolerating a "too large" error) or `null` when the profile could not be loaded.
 */
export async function refreshSessionUser(
  sdk: Sdk,
  session: EmployerSession
): Promise<EmployerSession | null> {
  const user = await fetchSessionUser(sdk, session.user.policyHolder?.code);
  return user ? { ...session, user } : null;
}

export type EnrollmentGate = { redirectTo: string } | { ok: true; user: EmployerSessionUser };

/** Enrollment layout guard: login → verify e-mail → (already linked) dashboard. */
export function enrollmentGate(user: EmployerSessionUser | null | undefined): EnrollmentGate {
  if (!user) return { redirectTo: employerPaths.login };
  if (!user.emailVerified) return { redirectTo: employerPaths.verifyEmail(user.email || undefined) };
  if (user.policyHolder) return { redirectTo: employerPaths.dashboard };
  return { ok: true, user };
}
