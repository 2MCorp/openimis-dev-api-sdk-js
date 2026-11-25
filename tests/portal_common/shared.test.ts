import { describe, expect, it } from "vitest";
import {
  DEFAULT_MONEY_CONFIG,
  addEmployeeBody,
  chartColors,
  createContractBody,
  createStaffSchema,
  employerColors,
  enrollmentRegisterSchema,
  formatAddressLine,
  formatConfiguredMoney,
  formatDelta,
  formatMoney,
  formatNumber,
  formatPercent,
  formatRatio,
  formatDateTimeParts,
  initials,
  normalizeMoneyConfig,
  payContractBody,
  registerSchema,
  signInSchema,
  updateStaffSchema,
  userDisplayName,
  userInitials,
  verifyEmailSchema,
} from "../../src/portal/common";

describe("user display", () => {
  it("prefers full name, falls back to username", () => {
    expect(userDisplayName({ otherNames: " Jane ", lastName: "Doe", username: "jd" })).toBe("Jane Doe");
    expect(userDisplayName({ username: " jd " })).toBe("jd");
    expect(userDisplayName(null)).toBe("");
    expect(userInitials({ otherNames: "jane", lastName: "doe" })).toBe("JD");
    expect(userInitials(undefined)).toBe("?");
    expect(initials("a b c")).toBe("AB");
  });
});

describe("money", () => {
  it("normalises partial config", () => {
    expect(normalizeMoneyConfig(null)).toEqual(DEFAULT_MONEY_CONFIG);
    expect(normalizeMoneyConfig({ currency: "USD", currencySymbolPosition: "RIGHT" })).toMatchObject({
      currency: "USD",
      currencyCode: "USD",
      currencySymbolPosition: "right",
    });
  });
  it("formats with symbol position and placeholder", () => {
    expect(formatConfiguredMoney(null)).toBe("—");
    expect(formatConfiguredMoney("abc")).toBe("—");
    expect(formatConfiguredMoney(5, { ...DEFAULT_MONEY_CONFIG, currencySymbolPosition: "right", currencySymbol: "F" })).toMatch(/5\.00 F$/);
    expect(formatConfiguredMoney(5)).toMatch(/^₦5\.00$/);
  });
});

describe("format", () => {
  it("handles empty values", () => {
    expect(formatNumber(undefined)).toBe("—");
    expect(formatMoney(1234.5, "NGN")).toMatch(/NGN$/);
    expect(formatRatio(0.1234)).toBe("12.3%");
    expect(formatPercent(12.34)).toBe("12.3%");
    expect(formatDelta(5)).toBe("+5.0%");
    expect(formatDelta(-5)).toBe("-5.0%");
    expect(formatDateTimeParts("nope")).toBeNull();
    expect(formatDateTimeParts("2026-07-27T12:56:00")).toMatchObject({ date: expect.any(String) });
  });
  it("joins non-empty address parts", () => {
    expect(formatAddressLine({ text: " 1 Main ", city: "Abuja", state: "" })).toBe("1 Main, Abuja");
    expect(formatAddressLine({})).toBeUndefined();
    expect(formatAddressLine(null)).toBeUndefined();
  });
});

describe("chart theme", () => {
  it("derives employer colours from the shared palette", () => {
    expect(employerColors.claims).toBe(chartColors.claims);
  });
});

describe("validation", () => {
  it("sign-in / register / verify", () => {
    expect(signInSchema.safeParse({ username: "a", password: "short" }).success).toBe(false);
    expect(signInSchema.safeParse({ username: "a", password: "longenough" }).success).toBe(true);
    expect(registerSchema.safeParse({ username: "a", email: "x", password: "longenough" }).success).toBe(false);
    expect(verifyEmailSchema.safeParse({ email: "a@b.co", otp: "12345a" }).success).toBe(false);
    expect(verifyEmailSchema.safeParse({ email: "a@b.co", otp: "123456" }).success).toBe(true);
  });
  it("HF enrollment + staff", () => {
    const base = { name: "Clinic", level: "H", location_id: "1", care_type: "B" };
    expect(enrollmentRegisterSchema.safeParse(base).success).toBe(true);
    expect(enrollmentRegisterSchema.safeParse({ ...base, level: "Z" }).error?.issues[0].message).toBe(
      "Select a valid facility level",
    );
    expect(createStaffSchema.parse({ username: "u", email: "a@b.co", password: "longenough" }).role).toBe("STAFF");
    expect(updateStaffSchema.parse({ role: "ADMIN", active: "on" }).active).toBe(true);
    expect(updateStaffSchema.parse({ role: "ADMIN", active: "false" }).active).toBe(false);
  });
  it("employer bodies keep only declared fields and coerce junk", () => {
    expect(payContractBody.parse({ contractId: "c1", providerCode: "p", paymentMethodCode: "card", amount: 1 })).toEqual({
      contractId: "c1",
      providerCode: "p",
      paymentMethodCode: "card",
      idempotencyKey: undefined,
    });
    expect(payContractBody.parse({}).contractId).toBe("");
    expect(addEmployeeBody.parse({ chfId: 5 }).chfId).toBe("5");
    expect(createContractBody.parse({ code: "C1" })).toEqual({ code: "C1", dateValidFrom: "", dateValidTo: "" });
  });
});
