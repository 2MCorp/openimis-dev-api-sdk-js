import type OpenIMISDevApiSdk from "../../index";
import { LoginCredentials, type HealthFacilityInfo, type UserInfo } from "../../auth/types";
import { fromApiResponse, httpStatus, type BackendResult } from "../common/backend";
import { apiFail, apiOk } from "../common/envelope";
import type { EnvelopeResult } from "../common/envelope";
import { normalizeExpiry } from "../common/server/session";
import { postLoginPath, verifyEmailPath } from "./access";
import { slimHfPermissions } from "./permissions";
import { jsonBodyOrEmpty } from "./request";
import type { HfSessionData, HfSessionHealthFacility, HfSessionUser } from "./types";
import {
  registerSchema,
  resendVerifySchema,
  signInSchema,
  validateWith,
  verifyEmailSchema,
} from "./validation";

export const HF_SESSION_COOKIE = "hf_session";
/** Browsers drop cookies larger than ~4KB; sealing fails above this. */
export const HF_MAX_SESSION_COOKIE_BYTES = 3500;

export const SESSION_TOO_LARGE_MESSAGE =
  "Sign-in succeeded but your session could not be stored. Please contact support.";

/** True for the error `sealSession` throws when the cookie exceeds the size limit. */
export function isSessionTooLargeError(err: unknown): boolean {
  return err instanceof Error && err.message.includes("too large");
}

function mapHealthFacility(
  hf: HealthFacilityInfo | Record<string, unknown> | undefined | null
): HfSessionHealthFacility | undefined {
  if (!hf || typeof hf !== "object") return undefined;
  const record = hf as Record<string, unknown>;
  const { id, name, code } = record;
  if (id == null && (name == null || name === "") && (code == null || code === "")) return undefined;
  if (Object.keys(record).length === 0) return undefined;
  return { id: String(id ?? ""), name: String(name ?? ""), code: String(code ?? "") };
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map(String).filter(Boolean);
}

/**
 * Map `/user/` (SDK `UserInfo` or raw JSON) into the sealed session user: permissions are
 * slimmed to the portal catalogue and groups dropped so the cookie stays small.
 */
export function mapUser(user: UserInfo | Record<string, unknown>): HfSessionUser {
  const record = user as UserInfo & Record<string, unknown>;
  const emailVerifiedRaw = record.emailVerified ?? record.email_verified;

  return {
    id: String(record.id ?? ""),
    username: String(record.username ?? ""),
    email: String(record.email ?? ""),
    lastName: String(record.lastName ?? record.last_name ?? ""),
    otherNames: String(record.otherNames ?? record.other_names ?? ""),
    language: String(record.language ?? "en"),
    phone: record.phone != null ? String(record.phone) : undefined,
    loginName:
      record.loginName != null
        ? String(record.loginName)
        : record.login_name != null
          ? String(record.login_name)
          : undefined,
    emailVerified:
      typeof emailVerifiedRaw === "boolean"
        ? emailVerifiedRaw
        : // Legacy users without a portal profile are treated as verified.
          emailVerifiedRaw == null
          ? true
          : Boolean(emailVerifiedRaw),
    permissions: slimHfPermissions(asStringArray(record.permissions)),
    groups: [],
    healthFacility: mapHealthFacility(
      (record.healthFacility ?? record.health_facility) as HealthFacilityInfo | Record<string, unknown> | undefined
    ),
  };
}

function extractErrorCode(resp: { data: unknown; errorDetails?: unknown[] }): string | undefined {
  const candidate = resp.data;
  if (candidate && typeof candidate === "object" && "code" in candidate) {
    const code = (candidate as { code?: unknown }).code;
    if (typeof code === "string") return code;
  }
  for (const detail of resp.errorDetails ?? []) {
    if (detail && typeof detail === "object" && "field" in detail) {
      if ((detail as { field?: unknown }).field === "code") {
        return String((detail as { errors?: unknown }).errors ?? "");
      }
    }
  }
  return undefined;
}

/** Session user from `/user/` using an authenticated SDK; `null` when it cannot be loaded. */
export async function fetchSessionUser(sdk: OpenIMISDevApiSdk): Promise<HfSessionUser | null> {
  const userResp = await sdk.auth.userAuth.getUser();
  if (!userResp.success || !userResp.data) return null;
  return mapUser(userResp.data);
}

export type LoginResult =
  | { ok: true; session: HfSessionData }
  | { ok: false; message: string; status: number; code?: string };

/**
 * Log in with an UNauthenticated SDK; the token is kept on that SDK and used to load the
 * profile. Returns a session ready for `sealSession` (token + expiry + slim user).
 */
export async function loginWithCredentials(
  sdk: OpenIMISDevApiSdk,
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
      code: extractErrorCode(login),
    };
  }

  const user = await fetchSessionUser(sdk);
  if (!user) return { ok: false, message: "Could not load user profile.", status: 500 };

  return {
    ok: true,
    session: {
      accessToken: login.data.token,
      accessTokenExpires: normalizeExpiry(login.data.expiry),
      user,
    },
  };
}

export async function registerPortalUser(
  sdk: OpenIMISDevApiSdk,
  input: { username: string; email: string; password: string }
): Promise<BackendResult> {
  return fromApiResponse(await sdk.auth.userAuth.register(input));
}

export async function verifyPortalEmail(
  sdk: OpenIMISDevApiSdk,
  input: { email: string; otp: string }
): Promise<BackendResult> {
  return fromApiResponse(await sdk.auth.userAuth.verify(input));
}

export async function resendPortalVerification(
  sdk: OpenIMISDevApiSdk,
  input: { email: string }
): Promise<BackendResult> {
  return fromApiResponse(await sdk.auth.userAuth.resendVerify(input));
}

/** Best-effort backend logout (the local cookie is cleared regardless). */
export async function logoutFromBackend(sdk: OpenIMISDevApiSdk): Promise<void> {
  try {
    await sdk.auth.userAuth.logout();
  } catch {
    // Best-effort
  }
}

// ---- API route handlers (unauthenticated) ----

/** POST /api/auth/register → 201 */
export async function handleAuthRegister(sdk: OpenIMISDevApiSdk, body: unknown): Promise<EnvelopeResult<unknown>> {
  const parsed = validateWith(registerSchema, jsonBodyOrEmpty(body), "Invalid registration payload");
  if (!parsed.success) return apiFail(400, parsed.message);
  const result = await registerPortalUser(sdk, parsed.data);
  if (!result.ok) return apiFail(httpStatus(result, 400), result.message);
  return apiOk(result.data ?? result.raw, 201);
}

/** POST /api/auth/verify */
export async function handleAuthVerify(sdk: OpenIMISDevApiSdk, body: unknown): Promise<EnvelopeResult<unknown>> {
  const parsed = validateWith(verifyEmailSchema, jsonBodyOrEmpty(body), "Invalid verification payload");
  if (!parsed.success) return apiFail(400, parsed.message);
  const result = await verifyPortalEmail(sdk, parsed.data);
  if (!result.ok) return apiFail(httpStatus(result, 400), result.message);
  return apiOk(result.data ?? result.raw);
}

/** POST /api/auth/verify/resend */
export async function handleAuthResend(sdk: OpenIMISDevApiSdk, body: unknown): Promise<EnvelopeResult<unknown>> {
  const parsed = validateWith(resendVerifySchema, jsonBodyOrEmpty(body), "Invalid resend payload");
  if (!parsed.success) return apiFail(400, parsed.message);
  const result = await resendPortalVerification(sdk, parsed.data);
  if (!result.ok) return apiFail(httpStatus(result, 400), result.message);
  return apiOk(result.data ?? result.raw);
}

// ---- page-level form actions ----

export type AuthFormFailure = {
  ok: false;
  /** HTTP status (400 validation, backend status otherwise). */
  status: number;
  errors?: Record<string, string | undefined>;
  message?: string;
  code?: string;
  /** Echo of non-secret submitted values for re-rendering the form. */
  values: Record<string, string>;
};

const str = (v: unknown) => String(v ?? "");

/**
 * Login form action. On success returns the session to seal into the cookie plus where to
 * redirect; the caller seals (see {@link isSessionTooLargeError}) and sets the cookie.
 */
export async function submitSignIn(
  sdk: OpenIMISDevApiSdk,
  form: { username?: unknown; password?: unknown }
): Promise<{ ok: true; session: HfSessionData; redirectTo: string } | AuthFormFailure> {
  const parsed = validateWith(signInSchema, { username: form.username, password: form.password });
  if (!parsed.success) {
    return { ok: false, status: 400, errors: parsed.fieldErrors, values: { username: str(form.username) } };
  }
  const result = await loginWithCredentials(sdk, parsed.data.username, parsed.data.password);
  if (!result.ok) {
    return {
      ok: false,
      status: result.status >= 400 && result.status < 600 ? result.status : 401,
      message: result.message,
      code: result.code,
      values: { username: parsed.data.username },
    };
  }
  return { ok: true, session: result.session, redirectTo: postLoginPath(result.session.user) };
}

/** Registration form action; success redirects to the OTP screen. */
export async function submitRegistration(
  sdk: OpenIMISDevApiSdk,
  form: { username?: unknown; email?: unknown; password?: unknown }
): Promise<{ ok: true; redirectTo: string } | AuthFormFailure> {
  const parsed = validateWith(registerSchema, form);
  if (!parsed.success) {
    return {
      ok: false,
      status: 400,
      errors: parsed.fieldErrors,
      values: { username: str(form.username), email: str(form.email) },
    };
  }
  const result = await registerPortalUser(sdk, parsed.data);
  if (!result.ok) {
    return {
      ok: false,
      status: httpStatus(result, 400),
      message: result.message,
      values: { username: parsed.data.username, email: parsed.data.email },
    };
  }
  return { ok: true, redirectTo: verifyEmailPath(parsed.data.email) };
}

/** OTP verification form action; success redirects to `/login`. */
export async function submitVerifyEmail(
  sdk: OpenIMISDevApiSdk,
  form: { email?: unknown; otp?: unknown }
): Promise<{ ok: true; redirectTo: string } | AuthFormFailure> {
  const parsed = validateWith(verifyEmailSchema, form);
  if (!parsed.success) {
    return { ok: false, status: 400, errors: parsed.fieldErrors, values: { email: str(form.email) } };
  }
  const result = await verifyPortalEmail(sdk, parsed.data);
  if (!result.ok) {
    return { ok: false, status: httpStatus(result, 400), message: result.message, values: { email: parsed.data.email } };
  }
  return { ok: true, redirectTo: "/login" };
}

/** "Resend code" form action. */
export async function submitResendVerification(
  sdk: OpenIMISDevApiSdk,
  form: { email?: unknown }
): Promise<{ ok: true; email: string; message: string } | AuthFormFailure> {
  const parsed = validateWith(resendVerifySchema, form);
  if (!parsed.success) {
    return { ok: false, status: 400, errors: parsed.fieldErrors, values: { email: str(form.email) } };
  }
  const result = await resendPortalVerification(sdk, parsed.data);
  if (!result.ok) {
    return { ok: false, status: httpStatus(result, 400), message: result.message, values: { email: parsed.data.email } };
  }
  return { ok: true, email: parsed.data.email, message: result.message };
}
