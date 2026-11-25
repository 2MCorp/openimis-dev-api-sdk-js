import { describe, expect, it } from "vitest";
import {
  parseAddEmployeeBody,
  parseCreateContractBody,
  parsePayContractBody,
  parseUpdateEmployeeBody,
  parseUploadEmployeesBody,
} from "../../src/portal/employer";

describe("parsePayContractBody", () => {
  it("keeps only the contract and the chosen method (no amount or currency)", () => {
    expect(
      parsePayContractBody({
        contractId: "c1",
        providerCode: "flutterwave",
        paymentMethodCode: "card",
        amount: 1,
        currency: "XXX",
      })
    ).toEqual({
      contractId: "c1",
      providerCode: "flutterwave",
      paymentMethodCode: "card",
      idempotencyKey: undefined,
    });
  });

  it("coerces a malformed body to empty strings for the SDK to reject", () => {
    expect(parsePayContractBody({}).contractId).toBe("");
    expect(parsePayContractBody(null).providerCode).toBe("");
    expect(parsePayContractBody("x").paymentMethodCode).toBe("");
  });

  it("drops an over-long idempotency key", () => {
    expect(parsePayContractBody({ idempotencyKey: "k".repeat(101) }).idempotencyKey).toBeUndefined();
    expect(parsePayContractBody({ idempotencyKey: " abc " }).idempotencyKey).toBe("abc");
  });
});

describe("request body parsers", () => {
  it("keeps missing text as empty strings and only record calculation rules", () => {
    expect(parseAddEmployeeBody({ chfId: 12, calculationRule: [1] })).toEqual({
      chfId: "12",
      policyHolderContributionPlanId: "",
      calculationRule: undefined,
    });
    expect(parseAddEmployeeBody({ calculationRule: { income: 5 } }).calculationRule).toEqual({ income: 5 });
  });

  it("trims the plan id of an update", () => {
    expect(parseUpdateEmployeeBody({ policyHolderContributionPlanId: " 7 " })).toEqual({
      policyHolderContributionPlanId: "7",
      calculationRule: undefined,
    });
    expect(parseUpdateEmployeeBody(undefined).policyHolderContributionPlanId).toBeUndefined();
  });

  it("parses upload and contract bodies", () => {
    expect(parseUploadEmployeesBody({ fileName: "a.csv", base64: "QQ==", defaultPlanCode: " P " })).toEqual({
      fileName: "a.csv",
      base64: "QQ==",
      defaultPlanCode: "P",
    });
    expect(parseCreateContractBody({ code: "C1" })).toEqual({ code: "C1", dateValidFrom: "", dateValidTo: "" });
  });
});
