import { describe, expect, it } from "vitest";
import { employerPaths } from "../../src/portal/employer";

describe("employerPaths auth / enrollment routes", () => {
  it("exposes the guest and enrollment routes", () => {
    expect(employerPaths.register).toBe("/register");
    expect(employerPaths.forgotPassword).toBe("/forgot-password");
    expect(employerPaths.enrollmentRegister).toBe("/enrollment/register");
    expect(employerPaths.enrollmentClaim).toBe("/enrollment/claim");
  });
});
