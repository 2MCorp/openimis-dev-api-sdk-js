import { describe, expect, it } from "vitest";
import { formatHours, formatWholeAmount } from "../../src/portal/common/format";

describe("dashboard formatters", () => {
  it("rounds whole amounts", () => {
    expect(formatWholeAmount(1234.6, "-")).toBe((1235).toLocaleString());
    expect(formatWholeAmount("abc", "-")).toBe("-");
    expect(formatWholeAmount(undefined, "-")).toBe("-");
  });
  it("formats hours", () => {
    expect(formatHours(3.46)).toBe("3.5h");
    expect(formatHours(undefined, "-")).toBe("-");
  });
});
