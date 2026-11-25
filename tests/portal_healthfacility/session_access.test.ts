import { describe, expect, it } from "vitest";
import {
  HF_MAIN_NAV_ITEMS,
  HF_SESSION_PERMISSIONS,
  canAccessPath,
  clientErrorMessage,
  filterNavItems,
  hasPermission,
  isNavActive,
  isSessionTooLargeError,
  loginWithCredentials,
  mapUser,
  notificationHref,
  notificationSecondaryLabel,
  patientDetailPath,
  patientInitials,
  postLoginPath,
  requiredPermissionForPath,
  resolveAppAccess,
  resolveEnrollmentAccess,
  slimHfPermissions,
  stripLocalePrefix,
  submitRegistration,
  submitResendVerification,
  submitSignIn,
  submitVerifyEmail,
  toRecentPatientFields,
  verifiedUserRedirect,
  verifyEmailPath,
  handleAuthRegister,
  handleAuthVerify,
  fetchSessionUser,
  logoutFromBackend,
  type HfSessionUser,
} from "../../src/portal/healthfacility";
import { createMockSdk } from "./helpers";

const AUTH = "/authentication/user-auth";
const user = (over: Partial<HfSessionUser> = {}): HfSessionUser => ({
  id: "1",
  username: "u",
  email: "u@x.org",
  lastName: "L",
  otherNames: "O",
  language: "en",
  emailVerified: true,
  permissions: ["api_auth.view_dashboard"],
  groups: [],
  healthFacility: { id: "1", name: "HF", code: "HF1" },
  ...over,
});

function authSdk() {
  const mock = createMockSdk();
  Object.assign(mock.http, { setToken() {}, setAuthScheme() {} });
  return mock;
}

describe("permissions and navigation", () => {
  it("slims the Django catalog to the six session permissions", () => {
    const slim = slimHfPermissions([
      "view_dashboard",
      "api_auth.view_claims",
      "auth.delete_user",
      "api_auth.add_claims",
      "api_auth.manage_hf_staff",
      "api_auth.view_claims",
    ]);
    expect(slim.sort()).toEqual(["api_auth.manage_hf_staff", "api_auth.view_claims", "api_auth.view_dashboard"]);
    expect(HF_SESSION_PERMISSIONS).toHaveLength(6);
  });

  it("maps routes to required permissions, ignoring locale prefixes", () => {
    expect(requiredPermissionForPath("/")).toBe("api_auth.view_dashboard");
    expect(requiredPermissionForPath("/fr/claims/abc")).toBe("api_auth.view_claims");
    expect(requiredPermissionForPath("/pre_authorizations/1")).toBe("api_auth.view_preauthorizations");
    expect(requiredPermissionForPath("/staffs")).toBe("api_auth.manage_hf_staff");
    expect(requiredPermissionForPath("/settings")).toBeNull();
    expect(stripLocalePrefix("/en")).toBe("/");
    expect(stripLocalePrefix("/english")).toBe("/english");
    expect(canAccessPath({ permissions: ["view_claims"] }, "/claims")).toBe(true);
    expect(canAccessPath({ permissions: [] }, "/claims")).toBe(false);
    expect(canAccessPath(null, "/settings")).toBe(true);
  });

  it("filters nav entries by permission and marks the active one", () => {
    const visible = filterNavItems(HF_MAIN_NAV_ITEMS, { permissions: ["api_auth.view_claims"] });
    expect(visible.map((i) => i.href)).toEqual(["/claims", "/reports"]);
    expect(isNavActive("/en/claims/1", "/claims")).toBe(true);
    expect(isNavActive("/claimsx", "/claims")).toBe(false);
    expect(isNavActive("/patients", "/")).toBe(false);
    expect(isNavActive("/en", "/")).toBe(true);
    expect(hasPermission(user(), "view_dashboard")).toBe(true);
  });
});

describe("session user mapping", () => {
  it("maps snake_case payloads, slims permissions and drops groups", () => {
    const mapped = mapUser({
      id: 5,
      username: "u",
      email: "e@x.org",
      last_name: "Doe",
      other_names: "John",
      permissions: ["api_auth.view_claims", "api_auth.add_claims", "auth.view_user"],
      groups: ["a"],
      health_facility: { id: 3, name: "HF", code: "H1" },
      email_verified: false,
    });
    expect(mapped).toMatchObject({
      id: "5",
      lastName: "Doe",
      otherNames: "John",
      language: "en",
      emailVerified: false,
      permissions: ["api_auth.view_claims"],
      groups: [],
      healthFacility: { id: "3", name: "HF", code: "H1" },
    });
  });

  it("treats missing verification as verified and empty facility as unlinked", () => {
    const mapped = mapUser({ id: 1, health_facility: {} });
    expect(mapped.emailVerified).toBe(true);
    expect(mapped.healthFacility).toBeUndefined();
  });

  it("detects the cookie-size error", () => {
    expect(isSessionTooLargeError(new Error('Cookie "hf_session" is too large'))).toBe(true);
    expect(isSessionTooLargeError(new Error("other"))).toBe(false);
  });
});

describe("login orchestration", () => {
  it("logs in, loads the profile and returns a session-ready user", async () => {
    const { http, sdk } = authSdk();
    http.on("POST", `${AUTH}/login/`, { token: "tok", expiry: "2099-01-01T00:00:00Z" });
    http.on("GET", `${AUTH}/user/`, {
      id: 1,
      username: "u",
      email: "u@x.org",
      permissions: ["api_auth.view_dashboard", "api_auth.something_else"],
      health_facility: { id: 1, name: "HF", code: "H1" },
      email_verified: true,
    });
    const res = await loginWithCredentials(sdk, "u", "password1");
    if (!res.ok) throw new Error("expected ok");
    expect(res.session.accessToken).toBe("tok");
    expect(res.session.accessTokenExpires).toBe(Date.parse("2099-01-01T00:00:00Z"));
    expect(res.session.user.permissions).toEqual(["api_auth.view_dashboard"]);
  });

  it("returns backend failures with status and error code", async () => {
    const { http, sdk } = authSdk();
    http.onError("POST", `${AUTH}/login/`, 403, "Email not verified", [{ field: "code", errors: "EMAIL_NOT_VERIFIED" }]);
    const res = await loginWithCredentials(sdk, "u", "password1");
    expect(res).toEqual({ ok: false, message: "Email not verified", status: 403, code: "EMAIL_NOT_VERIFIED" });
  });

  it("fails when the profile cannot be loaded", async () => {
    const { http, sdk } = authSdk();
    http.on("POST", `${AUTH}/login/`, { token: "tok", expiry: null });
    http.onError("GET", `${AUTH}/user/`, 500, "x");
    expect(await loginWithCredentials(sdk, "u", "password1")).toEqual({
      ok: false,
      message: "Could not load user profile.",
      status: 500,
    });
    expect(await fetchSessionUser(sdk)).toBeNull();
  });

  it("submitSignIn validates, then redirects according to the profile", async () => {
    const bad = await submitSignIn(authSdk().sdk, { username: "", password: "short" });
    expect(bad).toMatchObject({
      ok: false,
      status: 400,
      errors: { username: "User name is required", password: "Password must be 8+ characters" },
      values: { username: "" },
    });
    const { http, sdk } = authSdk();
    http.on("POST", `${AUTH}/login/`, { token: "tok", expiry: 4102444800 });
    http.on("GET", `${AUTH}/user/`, { id: 1, email: "u@x.org", email_verified: true, permissions: [] });
    const ok = await submitSignIn(sdk, { username: "u", password: "password1" });
    if (!ok.ok) throw new Error("expected ok");
    expect(ok.redirectTo).toBe("/enrollment");
    const { http: h2, sdk: s2 } = authSdk();
    h2.onError("POST", `${AUTH}/login/`, 401, "Bad credentials");
    expect(await submitSignIn(s2, { username: "u", password: "password1" })).toMatchObject({
      ok: false,
      status: 401,
      message: "Bad credentials",
      values: { username: "u" },
    });
  });

  it("logout never throws", async () => {
    const { http, sdk } = authSdk();
    http.onError("POST", `${AUTH}/logout/`, 500, "x");
    await expect(logoutFromBackend(sdk)).resolves.toBeUndefined();
  });
});

describe("auth forms and routes", () => {
  it("registers (201) and redirects to OTP entry", async () => {
    const { http, sdk } = authSdk();
    http.on("POST", `${AUTH}/register/`, { message: "created" }, { statusCode: 201 });
    const bad = await handleAuthRegister(sdk, { username: "u", email: "nope", password: "password1" });
    expect(bad).toEqual({ status: 400, body: { success: false, error: "Valid email is required" } });
    expect((await handleAuthRegister(sdk, undefined)).status).toBe(400);
    const ok = await handleAuthRegister(sdk, { username: "u", email: "u@x.org", password: "password1" });
    expect(ok.status).toBe(201);
    const form = await submitRegistration(sdk, { username: "u", email: "a+b@x.org", password: "password1" });
    expect(form).toEqual({ ok: true, redirectTo: "/verify-email?email=a%2Bb%40x.org" });
  });

  it("validates OTPs and maps backend errors", async () => {
    const { http, sdk } = authSdk();
    expect((await handleAuthVerify(sdk, { email: "u@x.org", otp: "12" })).body).toEqual({
      success: false,
      error: "OTP must be 6 digits",
    });
    http.onError("POST", `${AUTH}/verify/`, 400, "Invalid OTP");
    expect(await handleAuthVerify(sdk, { email: "u@x.org", otp: "123456" })).toEqual({
      status: 400,
      body: { success: false, error: "Invalid OTP" },
    });
    expect(await submitVerifyEmail(sdk, { email: "u@x.org", otp: "123456" })).toMatchObject({ ok: false, message: "Invalid OTP" });
    http.on("POST", `${AUTH}/verify/`, { message: "ok" });
    expect(await submitVerifyEmail(sdk, { email: "u@x.org", otp: "123456" })).toEqual({ ok: true, redirectTo: "/login" });
    http.on("POST", `${AUTH}/resend-verify/`, { message: "sent" });
    const resend = await submitResendVerification(sdk, { email: "u@x.org" });
    expect(resend.ok).toBe(true);
  });
});

describe("access decisions", () => {
  it("routes users through verify → enrollment → app", () => {
    expect(verifyEmailPath("a b@x.org")).toBe("/verify-email?email=a%20b%40x.org");
    expect(verifyEmailPath("")).toBe("/verify-email");
    expect(postLoginPath(user({ emailVerified: false }))).toBe("/verify-email?email=u%40x.org");
    expect(postLoginPath(user({ healthFacility: undefined }))).toBe("/enrollment");
    expect(postLoginPath(user())).toBe("/");
    expect(verifiedUserRedirect(user())).toBe("/");
    expect(verifiedUserRedirect(user({ healthFacility: undefined }))).toBe("/enrollment");
    expect(verifiedUserRedirect(user({ emailVerified: false }))).toBeNull();
    expect(verifiedUserRedirect(null)).toBeNull();
  });

  it("guards the app shell and enrollment", () => {
    expect(resolveAppAccess(user(), "/")).toEqual({ type: "ok" });
    expect(resolveAppAccess(user({ emailVerified: false }), "/")).toMatchObject({ type: "redirect" });
    expect(resolveAppAccess(user({ healthFacility: undefined }), "/")).toEqual({ type: "redirect", status: 303, to: "/enrollment" });
    expect(resolveAppAccess(user(), "/claims")).toMatchObject({ type: "forbidden", status: 403 });
    expect(resolveEnrollmentAccess(null)).toEqual({ type: "redirect", status: 303, to: "/login" });
    expect(resolveEnrollmentAccess(user())).toEqual({ type: "redirect", status: 303, to: "/" });
    expect(resolveEnrollmentAccess(user({ healthFacility: undefined }))).toEqual({ type: "ok" });
    expect(clientErrorMessage(503)).toMatch(/unexpected problem/);
    expect(clientErrorMessage(400, "Bad Request")).toBe("The request was invalid.");
    expect(clientErrorMessage(404, "Nope")).toBe("Nope");
  });
});

describe("notifications and patient formatting", () => {
  it("resolves notification links", () => {
    expect(notificationHref({ claimId: "c1" })).toBe("/claims/c1");
    expect(notificationHref({ claimId: "c1", visitType: "C" })).toBe("/encounters/c1");
    expect(notificationHref({ entity: "preauthorization", preauthorizationId: "p1" })).toBe("/pre_authorizations/p1");
    expect(notificationHref({ entity: "preauthorization" })).toBe("/pre_authorizations");
    expect(notificationHref({ entity: "preauthorization", status: "a", claimId: "c9", message: "approved" })).toBe("/claims/c9");
    expect(notificationHref({ message: "Pre-authorization approved", claimId: "c9", visitType: "C" })).toBe("/encounters/c9");
    expect(notificationHref({})).toBeNull();
  });

  it("builds a secondary label without raw uuids", () => {
    const uuid = "22222222-2222-4222-8222-222222222222";
    expect(notificationSecondaryLabel({ patientName: "Aisha", patientChfId: "CHF1", claimCode: "CLM-1" })).toBe("Aisha (CHF1) · CLM-1");
    expect(notificationSecondaryLabel({ patientChfId: uuid, claimCode: uuid, claimId: uuid })).toBeNull();
    expect(notificationSecondaryLabel({ claimId: "55" })).toBe("#55");
  });

  it("formats patient details", () => {
    expect(patientInitials("john  doe smith")).toBe("JD");
    expect(patientDetailPath({ uuid: "u", chfId: "C 1" })).toBe("/patients/u?identifier=C%201");
    expect(patientDetailPath({ id: "5" })).toBe("/patients/5");
    expect(
      toRecentPatientFields({
        id: "1",
        chfId: "C1",
        lastName: "D",
        otherNames: "J",
        fullName: "J D",
        isHead: false,
        cardIssued: false,
        address: { city: "Abuja", district: "AMAC" },
      })
    ).toMatchObject({ chfId: "C1", addressLine: "Abuja, AMAC" });
  });
});
