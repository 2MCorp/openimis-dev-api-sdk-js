import { describe, expect, it } from "vitest";
import {
  PENDING_TX_KEY,
  accessFor,
  calculationEntries,
  calculationFormValues,
  calculationPayload,
  calculationText,
  checkUploadFile,
  conditionHint,
  employerPaths,
  employeeUploadConfig,
  fileToBase64,
  filterNavItems,
  formatCalculationValue,
  humanizeInputName,
  isNavActive,
  isTerminalPaymentStatus,
  mainNavItems,
  paymentReturnUrl,
  paymentStatusMessageKey,
  planCheckout,
  routeAccessKey,
  statusTone,
  templateColumns,
  visitTypeMessageKey,
} from "../../src/portal/employer";
import type { CalculationParam } from "../../src/portal/employer";

const income: CalculationParam = {
  name: "annual_income",
  type: "number",
  label: { en: "Annual income", fr: "Revenu annuel" },
} as CalculationParam;
const tier: CalculationParam = {
  name: "tier",
  type: "select",
  label: { en: "Tier" },
  optionSet: [{ value: "a", label: { en: "Gold", fr: "Or" } }],
} as CalculationParam;
const flag: CalculationParam = { name: "smoker", type: "checkbox", label: {} } as CalculationParam;

describe("access and navigation", () => {
  it("computes feature flags from permissions", () => {
    const access = accessFor({ permissions: ["api_auth.view_employees", "view_plans"] });
    expect(access).toMatchObject({ members: true, packages: true, contracts: false, manageMembers: false });
    expect(accessFor(null).members).toBe(false);
  });

  it("maps routes (with locale prefix) to feature keys", () => {
    expect(routeAccessKey("/")).toBe("dashboard");
    expect(routeAccessKey("/fr/members/12")).toBe("members");
    expect(routeAccessKey("/staffs")).toBe("staff");
    expect(routeAccessKey("/profile")).toBeNull();
  });

  it("filters nav items by access and matches active routes", () => {
    const items = filterNavItems(mainNavItems, accessFor({ permissions: ["view_employees"] }));
    expect(items.map((i) => i.href)).toEqual(["/members", "/reports"]);
    expect(mainNavItems.find((i) => i.href === "/members")?.permission).toBe("api_auth.view_employees");
    expect(isNavActive("/en/members/3", "/members")).toBe(true);
    expect(isNavActive("/members", "/")).toBe(false);
    expect(isNavActive("/", "/")).toBe(true);
  });

  it("builds encoded paths", () => {
    expect(employerPaths.member("a/b")).toBe("/members/a%2Fb");
    expect(employerPaths.memberClaim("1", "2")).toBe("/members/1/claims/2");
  });
});

describe("calculation display helpers", () => {
  it("picks labels by locale, then English, then any", () => {
    expect(calculationText(income.label, "fr")).toBe("Revenu annuel");
    expect(calculationText(income.label, "sw")).toBe("Annual income");
    expect(calculationText({ pt: "Renda" }, "sw")).toBe("Renda");
    expect(calculationText(undefined, "en", "x")).toBe("x");
    expect(humanizeInputName("annual_income")).toBe("Annual income");
  });

  it("formats values (select option, boolean words, numbers, empty)", () => {
    expect(formatCalculationValue(tier, "a", { locale: "fr" })).toBe("Or");
    expect(formatCalculationValue(flag, true, { yes: "Oui" })).toBe("Oui");
    expect(formatCalculationValue(income, 1500, { locale: "en" })).toBe("1,500");
    expect(formatCalculationValue(income, undefined)).toBe("—");
  });

  it("lists declared inputs first, then undeclared stored values", () => {
    expect(calculationEntries({ annual_income: 10, legacy_bonus: 2 }, [income])).toEqual([
      { name: "annual_income", label: "Annual income", value: "10" },
      { name: "legacy_bonus", label: "Legacy bonus", value: "2" },
    ]);
  });

  it("builds form state and request payload", () => {
    const values = calculationFormValues([income, flag], { annual_income: 5 });
    expect(values).toEqual({ annual_income: "5", smoker: false });
    expect(calculationPayload([income, flag, tier], { ...values, annual_income: " 7 ", tier: "" })).toEqual({
      annual_income: "7",
      smoker: false,
    });
  });

  it("turns simple conditions into hints", () => {
    expect(conditionHint("INPUT>=1000")).toBe("≥ 1,000");
    expect(conditionHint("INPUT*2")).toBeUndefined();
  });
});

describe("labels", () => {
  it("maps statuses and visit types to message keys", () => {
    expect(paymentStatusMessageKey("paid")).toBe("payment_status_paid");
    expect(paymentStatusMessageKey("pending")).toBe("payment_status_pending");
    expect(visitTypeMessageKey(" e ")).toBe("claim_visit_emergency");
    expect(visitTypeMessageKey("X")).toBeUndefined();
    expect(statusTone("Request-For-Information")).toBe("warning");
    expect(statusTone("paid")).toBe("success");
    expect(statusTone("???")).toBe("neutral");
  });
});

describe("checkout", () => {
  it("plans a redirect or an auto-submitted form and rejects non-web URLs", () => {
    expect(planCheckout({ url: "https://pay.test/x", method: "GET" } as never)).toEqual({
      type: "redirect",
      url: "https://pay.test/x",
    });
    expect(
      planCheckout({ url: "https://pay.test/x", method: "POST", form: { a: 1, b: null } } as never)
    ).toEqual({
      type: "post",
      url: "https://pay.test/x",
      fields: [
        { name: "a", value: "1" },
        { name: "b", value: "" },
      ],
    });
    expect(planCheckout({ url: "javascript:alert(1)", method: "GET" } as never)).toBeNull();
    expect(planCheckout({ url: "", method: "GET" } as never)).toBeNull();
    expect(paymentReturnUrl("https://p.test/")).toBe("https://p.test/payments/return");
    expect(isTerminalPaymentStatus("pending")).toBe(false);
    expect(isTerminalPaymentStatus("failed")).toBe(true);
    expect(PENDING_TX_KEY).toBe("pendingPaymentTx");
  });
});

describe("upload helpers", () => {
  it("exposes SDK constraints and pre-checks files", () => {
    const config = employeeUploadConfig();
    expect(config.extensions).toEqual(["csv", "json", "xlsx"]);
    expect(checkUploadFile({ name: "m.csv", size: 10 })).toEqual({ ok: true });
    expect(checkUploadFile({ name: "m.xls", size: 10 })).toEqual({ ok: false, reason: "type" });
    expect(checkUploadFile({ name: "m.csv", size: config.maxBytes + 1 })).toEqual({ ok: false, reason: "size" });
    expect(templateColumns("a,b\r\n1,2")).toBe("a, b");
  });

  it("base64-encodes bytes", async () => {
    expect(await fileToBase64(new Blob(["hello"]))).toBe("aGVsbG8=");
  });
});
