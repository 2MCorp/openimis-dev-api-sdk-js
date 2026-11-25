import type { PolicyHolderInfo, UserInfo } from "../../auth/types";
import { PH_PORTAL_PERMISSIONS, slimPermissions } from "../../auth/permissions";
import type { SessionData, SessionUserBase } from "../common/server/session";

export const EMPLOYER_SESSION_COOKIE = "employer_session";

/** Employer (openIMIS policy holder) the portal user belongs to. */
export type EmployerSessionPolicyHolder = {
  code: string;
  tradeName: string;
  email?: string;
};

/** Employer-portal session user (the sealed cookie payload minus the token). */
export type EmployerSessionUser = SessionUserBase & {
  /** Active employer — sent as `PolicyHolder-Code` on every developer-API call. */
  policyHolder?: EmployerSessionPolicyHolder;
  /** All employers linked to this user (multi-org accounts can switch). */
  policyHolders: EmployerSessionPolicyHolder[];
};

export type EmployerSession = SessionData<EmployerSessionUser>;

function toSessionPolicyHolder(ph: PolicyHolderInfo): EmployerSessionPolicyHolder {
  return { code: ph.code, tradeName: ph.displayName, email: ph.email || undefined };
}

/**
 * Map SDK `UserInfo` (`/user/`) into the sealed session user. `preferredCode` keeps the
 * employer the user picked when the session is refreshed; employer resolution and
 * permission slimming are SDK rules.
 */
export function mapSessionUser(user: UserInfo, preferredCode?: string): EmployerSessionUser {
  const active = user.activePolicyHolder(preferredCode);
  return {
    id: String(user.id ?? ""),
    username: user.username,
    email: user.email,
    lastName: user.lastName,
    otherNames: user.otherNames,
    language: user.language || "en",
    phone: user.phone,
    loginName: user.loginName,
    // Legacy users without a portal profile are treated as verified.
    emailVerified: user.emailVerified ?? true,
    // The full Django catalog blows past cookie size limits — keep employer-portal perms only.
    permissions: slimPermissions(user.permissions, PH_PORTAL_PERMISSIONS),
    // Groups are unused in the portal UI; omit payload bloat from the cookie.
    groups: [],
    policyHolder: active ? toSessionPolicyHolder(active) : undefined,
    policyHolders: user.linkedPolicyHolders().map(toSessionPolicyHolder),
  };
}

/** Fill defaults for fields older cookies lack (pass to the session codec's `normalizeUser`). */
export function normalizeEmployerUser(user: EmployerSessionUser): EmployerSessionUser {
  return {
    ...user,
    emailVerified: user.emailVerified ?? true,
    permissions: user.permissions ?? [],
    groups: user.groups ?? [],
    policyHolders: user.policyHolders ?? [],
  };
}

/** Header the SDK needs: the token plus the active employer code (`createSdk(token, code)`). */
export function sdkCredentials(session: EmployerSession): { token: string; policyHolderCode?: string } {
  return { token: session.accessToken, policyHolderCode: session.user.policyHolder?.code || undefined };
}

export type SwitchEmployerResult =
  | { ok: true; session: EmployerSession; redirectTo: string }
  | { ok: false; status: 400; message: string };

/**
 * `POST /switch-employer` (form field `code`): change the active `PolicyHolder-Code`.
 * The caller reseals the returned session into the cookie and redirects.
 */
export function switchEmployer(session: EmployerSession, code: string): SwitchEmployerResult {
  const wanted = code.trim();
  const next = session.user.policyHolders.find((ph) => ph.code === wanted);
  if (!next) return { ok: false, status: 400, message: "That employer is not linked to your account." };
  return {
    ok: true,
    session: { ...session, user: { ...session.user, policyHolder: next } },
    redirectTo: "/",
  };
}

/** `GET /api/session` payload: safe user fields (never the token) plus the expiry. */
export type EmployerSessionInfo = {
  user: EmployerSessionUser;
  clientConfig: Record<string, never>;
  /** Server session expiry (ms epoch). */
  expiresAt: number;
};

/** What the layout (and the on-device offline snapshot) needs from a session. */
export function buildSessionInfo(session: EmployerSession): EmployerSessionInfo {
  return { user: session.user, clientConfig: {}, expiresAt: session.accessTokenExpires };
}
