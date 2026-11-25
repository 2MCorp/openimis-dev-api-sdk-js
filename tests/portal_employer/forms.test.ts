import { describe, expect, it } from "vitest";
import {
  formValue,
  parseAccountClaim,
  parseCreateStaff,
  parseEnrollmentRegister,
  parseForgotPassword,
  parseRegister,
  parseResetConfirm,
  parseResetVerify,
  parseSignIn,
  parseUpdateStaff,
  parseVerifyEmail,
} from "../../src/portal/employer";

const fd = (entries: Record<string, string>) => {
  const form = new FormData();
  for (const [k, v] of Object.entries(entries)) form.set(k, v);
  return form;
};

describe("formValue", () => {
  it("reads FormData, URLSearchParams and plain objects; absent is empty", () => {
    expect(formValue(fd({ a: "x" }), "a")).toBe("x");
    expect(formValue(new URLSearchParams("a=y"), "a")).toBe("y");
    expect(formValue({ a: 3 }, "a")).toBe("3");
    expect(formValue({}, "a")).toBe("");
    expect(formValue(fd({}), "a")).toBe("");
  });
});

describe("authentication forms", () => {
  it("sign-in requires both fields", () => {
    expect(parseSignIn(fd({}))).toEqual({
      ok: false,
      errors: { username: "User name is required", password: "Password is required" },
    });
    expect(parseSignIn(fd({ username: "u", password: "p" }))).toMatchObject({ ok: true });
  });

  it("register applies SDK rules and reports the first message per field", () => {
    const bad = parseRegister(fd({ username: "u", email: "nope", password: "short" }));
    expect(bad).toEqual({
      ok: false,
      errors: { email: "Valid email is required", password: "Password must be at least 8 characters" },
    });
    expect(parseRegister(fd({ username: "u", email: "a@b.co", password: "longenough" })).ok).toBe(true);
  });

  it("verify-email needs a valid email and a 6-digit OTP", () => {
    expect(parseVerifyEmail(fd({ email: "a@b.co", otp: "12345" }))).toEqual({
      ok: false,
      errors: { otp: "OTP must be 6 digits" },
    });
    expect(parseVerifyEmail(fd({ email: "a@b.co", otp: "123456" })).ok).toBe(true);
  });

  it("forgot-password checks the email", () => {
    expect(parseForgotPassword(fd({ email: "x" })).ok).toBe(false);
    expect(parseForgotPassword(fd({ email: "a@b.co" }))).toMatchObject({ ok: true, data: { email: "a@b.co" } });
  });

  it("reset verify trims the code and accepts 4-8 digits", () => {
    expect(parseResetVerify("a@b.co", fd({ otp: " 1234 " }))).toMatchObject({ ok: true, data: { otp: "1234" } });
    expect(parseResetVerify("a@b.co", fd({ otp: "12" }))).toMatchObject({
      ok: false,
      errors: { otp: "Enter the code from your email" },
    });
  });

  it("reset confirm checks length and match", () => {
    expect(parseResetConfirm(fd({ password: "short", confirm: "short" }))).toMatchObject({
      ok: false,
      errors: { password: "Password must be at least 8 characters" },
    });
    expect(parseResetConfirm(fd({ password: "longenough", confirm: "different" }))).toMatchObject({
      ok: false,
      errors: { confirm: "Passwords do not match" },
    });
    expect(parseResetConfirm(fd({ password: "longenough", confirm: "longenough" }))).toMatchObject({ ok: true });
  });
});

describe("enrollment forms", () => {
  it("registers an employer with compacted optionals and numeric expected members", () => {
    const parsed = parseEnrollmentRegister(
      fd({
        policyholder_code: "ACME1",
        policyholder_name: "Acme",
        policyholder_type: "NGO",
        contact_email: "",
        expected_members: " 12 ",
        location_id: "5",
      })
    );
    expect(parsed).toMatchObject({
      ok: true,
      data: { policyholder_code: "ACME1", policyholder_type: "NGO", expected_members: 12, location_id: "5" },
    });
    expect(parsed.ok && parsed.data.contact_email).toBeUndefined();
  });

  it("requires a registration number for corporate employers and a valid code", () => {
    const bad = parseEnrollmentRegister(
      fd({ policyholder_code: "A!", policyholder_name: "", policyholder_type: "CORPORATE", expected_members: "0" })
    );
    expect(bad).toMatchObject({
      ok: false,
      errors: {
        policyholder_code: "Policyholder code must be 3-50 alphanumeric characters",
        policyholder_name: "Policyholder name is required",
        expected_members: "Expected members must be a positive integer",
        registration_number: expect.any(String),
      },
    });
  });

  it("account claim needs a code and a valid contact email", () => {
    expect(parseAccountClaim(fd({ policyholder_code: "", contact_email: "x" }))).toMatchObject({
      ok: false,
      errors: { policyholder_code: expect.any(String), contact_email: "Invalid email format" },
    });
    expect(parseAccountClaim(fd({ policyholder_code: "ACME1", notes: " hi " }))).toMatchObject({
      ok: true,
      data: { policyholder_code: "ACME1", notes: "hi" },
    });
  });
});

describe("staff forms", () => {
  it("defaults the role to STAFF and validates the password", () => {
    expect(parseCreateStaff(fd({ username: "u", email: "a@b.co", password: "longenough" }))).toMatchObject({
      ok: true,
      data: { role: "STAFF" },
    });
    expect(parseCreateStaff(fd({ username: "u", email: "a@b.co", password: "x" }))).toMatchObject({
      ok: false,
      errors: { password: "Password must be at least 8 characters" },
    });
  });

  it("update needs a valid role and reads the active flag", () => {
    expect(parseUpdateStaff(fd({ role: "BOSS", active: "true" }))).toMatchObject({
      ok: false,
      errors: { role: "Select a valid role" },
    });
    expect(parseUpdateStaff(fd({ role: "ADMIN", active: "on" }))).toEqual({
      ok: true,
      data: { role: "ADMIN", active: true },
    });
    expect(parseUpdateStaff(fd({ role: "ADMIN" }))).toMatchObject({ data: { active: false } });
  });
});
