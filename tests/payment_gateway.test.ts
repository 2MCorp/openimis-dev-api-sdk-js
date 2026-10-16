import { describe, expect, it } from "vitest";
import {
  classifyGatewayStatus,
  parseGatewayTransaction,
  parsePaymentRedirect,
} from "../src/formalsector/payment_gateway";

describe("payment gateway parsing", () => {
  it("classifies integrator statuses", () => {
    expect(classifyGatewayStatus("COMPLETED")).toBe("paid");
    expect(classifyGatewayStatus("EXPIRED")).toBe("failed");
    expect(classifyGatewayStatus("PROCESSING")).toBe("pending");
    expect(classifyGatewayStatus(undefined)).toBe("pending");
  });

  it("parses a POST redirect", () => {
    const redirect = parsePaymentRedirect({
      success: true,
      data: {
        transaction_id: "tx1",
        status: "pending",
        redirect_url: "https://pay.example/checkout",
        redirect_method: "post",
        redirect_form: { token: "abc" },
      },
    });
    expect(redirect).toMatchObject({
      transactionId: "tx1",
      status: "PENDING",
      method: "POST",
      url: "https://pay.example/checkout",
      form: { token: "abc" },
    });
  });

  it("parses a transaction", () => {
    const tx = parseGatewayTransaction({ id: "t", status: "COMPLETED", amount: "150.50", currency: "GMD" });
    expect(tx).toMatchObject({ id: "t", statusKey: "paid", amount: 150.5, currency: "GMD" });
  });
});
