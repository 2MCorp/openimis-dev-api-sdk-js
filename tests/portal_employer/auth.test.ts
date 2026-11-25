import { describe, expect, it } from "vitest";
import { ApiResponse } from "../../src/api_response";
import {
  appGate,
  claimEnrollmentAction,
  confirmResetAction,
  enrollmentGate,
  guestRedirect,
  loadEnrollmentOverview,
  loginAction,
  parseResetState,
  postAuthRedirect,
  registerAction,
  registerEnrollmentAction,
  requestResetAction,
  resendVerificationAction,
  resetStep,
  verifyEmailPageState,
  verifyResetAction,
  loadStaffDetail,
  createStaffAction,
  updateStaffAction,
} from "../../src/portal/employer";
import type { EmployerSessionUser } from "../../src/portal/employer";
import { fakeSdk } from "./helpers";

const form = (entries: Record<string, string>) => entries;

const user = (over: Partial<EmployerSessionUser> = {}): EmployerSessionUser => ({
  id: "1",
  username: "u",
  email: "u@x.org",
  lastName: "",
  otherNames: "",
  language: "en",
  emailVerified: true,
  permissions: ["api_auth.view_ph_dashboard", "api_auth.view_employees"],
  groups: [],
  policyHolder: { code: "PH1", tradeName: "Acme" },
  policyHolders: [{ code: "PH1", tradeName: "Acme" }],
  ...over,
});

describe("redirect rules", () => {
  it("sends unverified users to verify-email, unlinked users to enrollment", () => {
    expect(postAuthRedirect(user({ emailVerified: false }))).toBe("/verify-email?email=u%40x.org");
    expect(postAuthRedirect(user({ emailVerified: false, email: "" }))).toBe("/verify-email");
    expect(postAuthRedirect(user({ policyHolder: undefined }))).toBe("/enrollment");
    expect(postAuthRedirect(user())).toBe("/");
  });

  it("guards app pages by session, e-mail, employer and permission", () => {
    expect(appGate(null, "/")).toEqual({ type: "redirect", to: "/login" });
    expect(appGate(user({ emailVerified: false }), "/")).toMatchObject({ type: "redirect" });
    expect(appGate(user({ policyHolder: undefined }), "/")).toEqual({ type: "redirect", to: "/enrollment" });
    expect(appGate(user(), "/contracts")).toMatchObject({ type: "forbidden", status: 403 });
    const gate = appGate(user(), "/fr/members", { onlinePayments: true });
    expect(gate).toMatchObject({ type: "ok", onlinePayments: true });
    expect(gate.type === "ok" && gate.access.members).toBe(true);
  });

  it("sends staff without dashboard access to the members list", () => {
    const staff = user({ permissions: ["api_auth.view_employees"] });
    expect(appGate(staff, "/")).toEqual({ type: "redirect", to: "/members" });
  });

  it("enrollment and guest guards", () => {
    expect(enrollmentGate(null)).toEqual({ redirectTo: "/login" });
    expect(enrollmentGate(user())).toEqual({ redirectTo: "/" });
    expect(enrollmentGate(user({ policyHolder: undefined }))).toMatchObject({ ok: true });
    expect(guestRedirect(null, "login")).toBeNull();
    expect(guestRedirect(user(), "register")).toBe("/");
    expect(guestRedirect(user({ policyHolder: undefined }), "login")).toBe("/enrollment");
  });

  it("verify-email page prefers the query email and redirects verified users", () => {
    expect(verifyEmailPageState("q@x.org", user({ emailVerified: false }))).toEqual({ email: "q@x.org" });
    expect(verifyEmailPageState(null, null)).toEqual({ email: "" });
    expect(verifyEmailPageState(null, user())).toEqual({ redirectTo: "/" });
    expect(verifyEmailPageState(null, user({ policyHolder: undefined }))).toEqual({ redirectTo: "/enrollment" });
  });
});

describe("loginAction", () => {
  const userPayload = {
    id: 7,
    username: "jdoe",
    email: "j@x.org",
    last_name: "Doe",
    other_names: "Jane",
    permissions: ["api_auth.view_employees"],
    policy_holder: { code: "PH1", trade_name: "Acme" },
  };

  it("validates before calling the backend", async () => {
    const result = await loginAction(fakeSdk({}), form({ username: "", password: "" }));
    expect(result).toMatchObject({ ok: false, status: 400, errors: { username: "User name is required" } });
  });

  it("returns the session and the landing page on success", async () => {
    const { UserInfo, AuthTokenResponse } = await import("../../src/auth/types");
    const sdk = fakeSdk({
      auth: {
        userAuth: {
          login: async () => ApiResponse.ok({ token: "tok", expiry: 1900000000 } as unknown as InstanceType<typeof AuthTokenResponse>),
          getUser: async () => ApiResponse.ok(UserInfo.fromJSON(userPayload)),
        },
      },
    });
    const result = await loginAction(sdk, form({ username: "jdoe", password: "pw" }));
    expect(result).toMatchObject({ ok: true, redirectTo: "/" });
    if (result.ok) {
      expect(result.session.accessToken).toBe("tok");
      expect(result.session.accessTokenExpires).toBe(1900000000 * 1000);
      expect(result.session.user.policyHolder?.code).toBe("PH1");
    }
  });

  it("surfaces the backend message, status and error code", async () => {
    const failed = ApiResponse.fail(403, "Email not verified", [{ field: "code", errors: "email_not_verified" }]);
    const sdk = fakeSdk({ auth: { userAuth: { login: async () => failed } } });
    expect(await loginAction(sdk, form({ username: "u", password: "p" }))).toEqual({
      ok: false,
      status: 403,
      values: { username: "u" },
      message: "Email not verified",
      code: "email_not_verified",
    });
  });
});

describe("register and verification actions", () => {
  it("registers and points at verify-email", async () => {
    const sdk = fakeSdk({ auth: { userAuth: { register: async () => ApiResponse.ok({}) } } });
    expect(
      await registerAction(sdk, form({ username: "u", email: "a@b.co", password: "longenough" }))
    ).toEqual({ ok: true, redirectTo: "/verify-email?email=a%40b.co" });
  });

  it("echoes values and uses the backend status when registration fails", async () => {
    const sdk = fakeSdk({ auth: { userAuth: { register: async () => ApiResponse.fail(409, "Taken") } } });
    expect(
      await registerAction(sdk, form({ username: "u", email: "a@b.co", password: "longenough" }))
    ).toEqual({ ok: false, status: 409, values: { username: "u", email: "a@b.co" }, message: "Taken" });
  });

  it("resend returns a message", async () => {
    const sdk = fakeSdk({ auth: { userAuth: { resendVerify: async () => ApiResponse.ok({}, 200, "Sent") } } });
    expect(await resendVerificationAction(sdk, form({ email: "a@b.co" }))).toEqual({
      ok: true,
      email: "a@b.co",
      resent: true,
      message: "Sent",
    });
  });
});

describe("password reset flow", () => {
  it("round-trips the cookie state and derives the step", () => {
    expect(parseResetState(undefined)).toBeNull();
    expect(parseResetState("{bad")).toBeNull();
    expect(parseResetState('{"email":5}')).toBeNull();
    expect(resetStep(null)).toBe("request");
    expect(resetStep({ email: "a@b.co" })).toBe("verify");
    expect(resetStep({ email: "a@b.co", token: "t" })).toBe("confirm");
  });

  it("walks request → verify → confirm", async () => {
    const auth = {
      requestPasswordReset: async () => ApiResponse.ok({}),
      verifyPasswordResetOtp: async () => ApiResponse.ok({ resetToken: "rt" }),
      confirmPasswordReset: async () => ApiResponse.ok({}),
    };
    const sdk = fakeSdk({ auth: { userAuth: auth } });
    const requested = await requestResetAction(sdk, form({ email: "a@b.co" }));
    expect(requested).toMatchObject({ ok: true, state: { email: "a@b.co" }, flag: "sent" });
    const verified = await verifyResetAction(sdk, { email: "a@b.co" }, form({ otp: "123456" }));
    expect(verified).toMatchObject({ ok: true, state: { email: "a@b.co", token: "rt" } });
    const done = await confirmResetAction(sdk, { email: "a@b.co", token: "rt" }, form({ password: "longenough", confirm: "longenough" }));
    expect(done).toMatchObject({ ok: true, state: null, redirectTo: "/login?reset=1" });
  });

  it("fails closed without state", async () => {
    const sdk = fakeSdk({});
    expect(await verifyResetAction(sdk, null, form({ otp: "123456" }))).toMatchObject({
      ok: false,
      status: 400,
      message: "Your reset session expired. Start again.",
    });
    expect(await confirmResetAction(sdk, { email: "a@b.co" }, form({}))).toMatchObject({ ok: false, status: 400 });
  });
});

describe("enrollment actions", () => {
  const openCheck = (open: boolean) => ({
    enrollment: {
      policyHolder: {
        hasOpenSubmission: async () => ApiResponse.ok(open),
        registerAndSubmit: async () => ApiResponse.ok({}),
        claimAccount: async () => ApiResponse.ok({}),
        listSubmissions: async () =>
          ApiResponse.ok([
            { uuid: "u1", status: "PENDING", kind: "registration", code: "ACME1", name: "Acme" },
            { uuid: "u2", status: "APPROVED", kind: "registration" },
          ]),
      },
    },
  });

  it("blocks a second open submission", async () => {
    const result = await registerEnrollmentAction(
      fakeSdk(openCheck(true)),
      form({ policyholder_code: "ACME1", policyholder_name: "Acme" })
    );
    expect(result).toMatchObject({ ok: false, status: 400, values: { policyholder_code: "ACME1" } });
    expect(await claimEnrollmentAction(fakeSdk(openCheck(true)), form({ policyholder_code: "ACME1" }))).toMatchObject({
      ok: false,
    });
  });

  it("registers when nothing is open and returns to /enrollment", async () => {
    expect(
      await registerEnrollmentAction(fakeSdk(openCheck(false)), form({ policyholder_code: "ACME1", policyholder_name: "Acme" }))
    ).toEqual({ ok: true, redirectTo: "/enrollment" });
    expect(await claimEnrollmentAction(fakeSdk(openCheck(false)), form({ policyholder_code: "ACME1" }))).toEqual({
      ok: true,
      redirectTo: "/enrollment",
    });
  });

  it("summarises open submissions and fails closed", async () => {
    const overview = await loadEnrollmentOverview(fakeSdk(openCheck(false)));
    expect(overview.pending).toEqual([
      { uuid: "u1", status: "PENDING", kind: "registration", summary: "ACME1 — Acme", dateCreated: undefined },
    ]);
    expect(overview.hasOpenSubmission).toBe(true);
    const broken = await loadEnrollmentOverview(
      fakeSdk({ enrollment: { policyHolder: { listSubmissions: async () => ApiResponse.fail(500, "x") } } })
    );
    expect(broken).toMatchObject({ hasOpenSubmission: true, pending: [] });
    expect(broken.error).toBeTruthy();
  });
});

describe("staff actions", () => {
  it("maps a missing staff member to a 404 page", async () => {
    const sdk = fakeSdk({ formalSector: { staffs: { get: async () => ApiResponse.fail(0, "x") } } });
    expect(await loadStaffDetail(sdk, "1")).toEqual({ ok: false, status: 404, message: "Staff member not found." });
  });

  it("never echoes the password and returns field errors", async () => {
    const result = await createStaffAction(fakeSdk({}), form({ username: "u", email: "a@b.co", password: "x" }));
    expect(result).toMatchObject({ ok: false, status: 400, values: { password: "", role: "STAFF" } });
  });

  it("updates role and active flag", async () => {
    let sent: unknown;
    const sdk = fakeSdk({
      formalSector: {
        staffs: {
          update: async (_id: string, payload: unknown) => {
            sent = payload;
            return ApiResponse.ok(null);
          },
        },
      },
    });
    expect(await updateStaffAction(sdk, "1", form({ role: "ADMIN", active: "true" }))).toEqual({
      ok: true,
      updated: true,
      staff: null,
    });
    expect(sent).toEqual({ role: "ADMIN", is_active: true });
  });
});
