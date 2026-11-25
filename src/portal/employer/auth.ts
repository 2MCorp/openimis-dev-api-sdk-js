import type { OpenIMISDevApiSdk } from "../../index";
import {
  LoginCredentials,
  PasswordResetConfirmRequest,
  PasswordResetRequest,
  UserType,
  VerifyOtpRequest,
} from "../../auth/types";
import type { ApiResponse } from "../../api_response";
import { normalizeExpiry } from "../common/server/session";
import { toUserFacingApiError } from "../common/user_facing_error";
import { httpStatus } from "./envelope";
import {
  formValue,
  parseForgotPassword,
  parseRegister,
  parseResendVerify,
  parseResetConfirm,
  parseResetVerify,
  parseSignIn,
  parseVerifyEmail,
} from "./forms";
import type { FieldErrors, FormInput } from "./forms";
import { employerPaths } from "./paths";
import { mapSessionUser } from "./session";
import type { EmployerSession, EmployerSessionUser } from "./session";

type Sdk = OpenIMISDevApiSdk;

/**
 * Auth form logic for the employer portal. Every function takes an SDK (anonymous for
 * login / register / reset, token-scoped otherwise) and the raw form, and returns a
 * structured result. The framework layer only sets / clears cookies and redirects.
 */

/** Failed form submission — echo `values`, show `errors` per field and / or `message`. */
export type FormFailure = {
  ok: false;
  /** HTTP status to answer with. */
  status: number;
  values?: Record<string, string | undefined>;
  errors?: FieldErrors;
  message?: string;
  /** Backend error code (e.g. `email_not_verified`) when it sent one. */
  code?: string;
};

function failure(status: number, extra: Omit<FormFailure, "ok" | "status">): FormFailure {
  return { ok: false, status, ...extra };
}

/** Same as the original `fail(result.status >= 400 ? … : fallback)`. */
function statusOr(status: number | string, fallback: number): number {
  return httpStatus(status, fallback);
}

function responseStatus(resp: { statusCode: string | number }): number {
  return Number(resp.statusCode) || 0;
}

/** Where a signed-in user lands: verify e-mail → enrollment → dashboard. */
export function postAuthRedirect(user: Pick<EmployerSessionUser, "emailVerified" | "email" | "policyHolder">): string {
  if (!user.emailVerified) return employerPaths.verifyEmail(user.email || undefined);
  if (!user.policyHolder) return employerPaths.enrollment;
  return employerPaths.dashboard;
}

// ── Session user ────────────────────────────────────────────────────────────────────

/** `/user/` mapped to the session user (permissions, e-mail status and employers). */
export async function fetchSessionUser(sdk: Sdk, preferredCode?: string): Promise<EmployerSessionUser | null> {
  const resp = await sdk.auth.userAuth.getUser();
  if (!resp.success || !resp.data) return null;
  return mapSessionUser(resp.data, preferredCode);
}

function extractErrorCode(resp: {
  data: unknown;
  errorDetails?: unknown[];
  raw?: unknown;
}): string | undefined {
  for (const candidate of [resp.data, resp.raw]) {
    if (candidate && typeof candidate === "object" && "code" in candidate) {
      const code = (candidate as { code?: unknown }).code;
      if (typeof code === "string") return code;
    }
  }
  for (const detail of resp.errorDetails ?? []) {
    if (detail && typeof detail === "object" && "field" in detail) {
      const d = detail as { field?: unknown; errors?: unknown };
      if (d.field === "code") return String(d.errors ?? "");
    }
  }
  return undefined;
}

export type LoginResult =
  | { ok: true; session: EmployerSession }
  | { ok: false; message: string; status: number; code?: string };

/** Sign in against the backend and load the session user. `sdk` must be anonymous. */
export async function loginWithCredentials(
  sdk: Sdk,
  username: string,
  password: string
): Promise<LoginResult> {
  const login = await sdk.auth.userAuth.login(new LoginCredentials(username, password), {
    persistToken: true,
  });
  if (!login.success || !login.data?.token) {
    return {
      ok: false,
      message: login.message || "Invalid username or password.",
      status: Number(login.statusCode) || 401,
      code: extractErrorCode(login as { data: unknown; errorDetails?: unknown[]; raw?: unknown }),
    };
  }
  const token = login.data.token;
  const user = await fetchSessionUser(sdk);
  if (!user) return { ok: false, message: "Could not load user profile.", status: 500 };
  return {
    ok: true,
    session: { accessToken: token, accessTokenExpires: normalizeExpiry(login.data.expiry), user },
  };
}

export type LoginActionResult =
  | { ok: true; session: EmployerSession; redirectTo: string }
  | FormFailure;

/**
 * Login form (`username`, `password`). On success the caller seals `session` into the
 * cookie (see `sessionTooLargeFailure` if sealing throws) and redirects to `redirectTo`.
 */
export async function loginAction(sdk: Sdk, form: FormInput): Promise<LoginActionResult> {
  const parsed = parseSignIn(form);
  if (!parsed.ok) {
    return failure(400, { values: { username: formValue(form, "username") }, errors: parsed.errors });
  }
  const result = await loginWithCredentials(sdk, parsed.data.username, parsed.data.password);
  if (!result.ok) {
    return failure(statusOr(result.status, 401), {
      values: { username: parsed.data.username },
      message: result.message,
      code: result.code,
    });
  }
  return { ok: true, session: result.session, redirectTo: postAuthRedirect(result.session.user) };
}

/** Failure to return when the sealed session cookie would exceed the browser limit. */
export function sessionTooLargeFailure(username: string): FormFailure {
  return failure(500, {
    values: { username },
    message: "Sign-in succeeded but your session could not be stored. Please contact support.",
  });
}

/** Best-effort backend logout (the local cookie is cleared regardless). */
export async function logoutAction(sdk: Sdk): Promise<{ redirectTo: string }> {
  try {
    await sdk.auth.userAuth.logout();
  } catch {
    // ignore
  }
  return { redirectTo: employerPaths.login };
}

// ── Register / verify e-mail ────────────────────────────────────────────────────────

export type RedirectResult = { ok: true; redirectTo: string };

/** Register form (`username`, `email`, `password`) → redirect to e-mail verification. */
export async function registerAction(sdk: Sdk, form: FormInput): Promise<RedirectResult | FormFailure> {
  const values = { username: formValue(form, "username"), email: formValue(form, "email") };
  const parsed = parseRegister(form);
  if (!parsed.ok) return failure(400, { values, errors: parsed.errors });
  const resp = await sdk.auth.userAuth.register(parsed.data);
  if (!resp.success) {
    return failure(statusOr(responseStatus(resp), 400), {
      values: { username: parsed.data.username, email: parsed.data.email },
      message: resp.message,
    });
  }
  return { ok: true, redirectTo: employerPaths.verifyEmail(parsed.data.email) };
}

/** Verify-email form (`email`, `otp`) → redirect to login. */
export async function verifyEmailAction(sdk: Sdk, form: FormInput): Promise<RedirectResult | FormFailure> {
  const parsed = parseVerifyEmail(form);
  if (!parsed.ok) return failure(400, { values: { email: formValue(form, "email") }, errors: parsed.errors });
  const resp = await sdk.auth.userAuth.verify(parsed.data);
  if (!resp.success) {
    return failure(statusOr(responseStatus(resp), 400), {
      values: { email: parsed.data.email },
      message: resp.message,
    });
  }
  return { ok: true, redirectTo: employerPaths.login };
}

/** Resend-verification form (`email`). */
export async function resendVerificationAction(
  sdk: Sdk,
  form: FormInput
): Promise<{ ok: true; email: string; resent: true; message: string } | FormFailure> {
  const parsed = parseResendVerify(form);
  if (!parsed.ok) return failure(400, { values: { email: formValue(form, "email") }, errors: parsed.errors });
  const resp = await sdk.auth.userAuth.resendVerify(parsed.data);
  if (!resp.success) {
    return failure(statusOr(responseStatus(resp), 400), {
      values: { email: parsed.data.email },
      message: resp.message,
    });
  }
  return { ok: true, email: parsed.data.email, resent: true, message: resp.message };
}

/** Email shown on the verify page: `?email=` wins over the session's. */
export function verifyEmailPageState(
  queryEmail: string | null | undefined,
  user: Pick<EmployerSessionUser, "email" | "emailVerified" | "policyHolder"> | null | undefined
): { redirectTo: string } | { email: string } {
  if (user?.emailVerified) {
    return { redirectTo: user.policyHolder ? employerPaths.dashboard : employerPaths.enrollment };
  }
  return { email: queryEmail || user?.email || "" };
}

// ── Password reset (state lives in a short-lived httpOnly cookie) ───────────────────

export const RESET_COOKIE = "employer_pw_reset";
export const RESET_COOKIE_PATH = "/forgot-password";
export const RESET_TTL_SECONDS = 15 * 60;

/** Cookie contents: the e-mail, plus the reset token once the code is verified. */
export type ResetState = { email: string; token?: string };
export type ResetStep = "request" | "verify" | "confirm";

export function parseResetState(raw: string | undefined | null): ResetState | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as ResetState;
    return typeof parsed?.email === "string" ? parsed : null;
  } catch {
    return null;
  }
}

export function serializeResetState(state: ResetState): string {
  return JSON.stringify(state);
}

export function resetStep(state: ResetState | null): ResetStep {
  return state?.token ? "confirm" : state ? "verify" : "request";
}

/** Cookie options for the reset state (framework-neutral names). */
export function resetCookieOptions(secure: boolean) {
  return {
    path: RESET_COOKIE_PATH,
    httpOnly: true,
    sameSite: "strict" as const,
    secure,
    maxAge: RESET_TTL_SECONDS,
  };
}

const RESET_EXPIRED = "Your reset session expired. Start again.";

export type ResetActionResult =
  | { ok: true; state: ResetState | null; redirectTo?: string; flag: "sent" | "verified" | "resent" | "restarted" | "done" }
  | FormFailure;

function backendFailure(resp: ApiResponse<unknown>): FormFailure {
  const status = responseStatus(resp);
  return failure(httpStatus(status), { message: toUserFacingApiError(status, resp.message) });
}

/** Step 1 — form `email`; on success write `state` to the cookie. */
export async function requestResetAction(sdk: Sdk, form: FormInput): Promise<ResetActionResult> {
  const parsed = parseForgotPassword(form);
  if (!parsed.ok) return failure(400, { values: { email: formValue(form, "email") }, errors: parsed.errors });
  const resp = await sdk.auth.userAuth.requestPasswordReset(
    new PasswordResetRequest(parsed.data.email, UserType.Interactive)
  );
  if (!resp.success) {
    const base = backendFailure(resp);
    return { ...base, values: { email: parsed.data.email } };
  }
  return { ok: true, state: { email: parsed.data.email }, flag: "sent" };
}

/** Step 2 — form `otp`; on success the state gains the reset token. */
export async function verifyResetAction(
  sdk: Sdk,
  state: ResetState | null,
  form: FormInput
): Promise<ResetActionResult> {
  if (!state) return failure(400, { message: RESET_EXPIRED });
  const parsed = parseResetVerify(state.email, form);
  if (!parsed.ok) return failure(400, { errors: parsed.errors });
  const resp = await sdk.auth.userAuth.verifyPasswordResetOtp(new VerifyOtpRequest(parsed.data.email, parsed.data.otp));
  if (!resp.success || !resp.data?.resetToken) return backendFailure(resp);
  return { ok: true, state: { email: state.email, token: resp.data.resetToken }, flag: "verified" };
}

/** Send the code again (back to the verify step). */
export async function resendResetAction(sdk: Sdk, state: ResetState | null): Promise<ResetActionResult> {
  if (!state) return failure(400, { message: RESET_EXPIRED });
  const resp = await sdk.auth.userAuth.requestPasswordReset(
    new PasswordResetRequest(state.email, UserType.Interactive)
  );
  if (!resp.success) return backendFailure(resp);
  return { ok: true, state: { email: state.email }, flag: "resent" };
}

/** Step 3 — form `password`, `confirm`; on success clear the cookie and go to login. */
export async function confirmResetAction(
  sdk: Sdk,
  state: ResetState | null,
  form: FormInput
): Promise<ResetActionResult> {
  if (!state?.token) return failure(400, { message: RESET_EXPIRED });
  const parsed = parseResetConfirm(form);
  if (!parsed.ok) return failure(400, { errors: parsed.errors });
  const resp = await sdk.auth.userAuth.confirmPasswordReset(
    new PasswordResetConfirmRequest(state.email, state.token, parsed.data.password, UserType.Interactive)
  );
  if (!resp.success) return backendFailure(resp);
  return { ok: true, state: null, redirectTo: "/login?reset=1", flag: "done" };
}

/** Abandon the flow: clear the cookie. */
export function restartResetAction(): ResetActionResult {
  return { ok: true, state: null, flag: "restarted" };
}
