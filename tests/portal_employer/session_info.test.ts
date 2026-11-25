import { describe, expect, it } from "vitest";
import { buildSessionInfo } from "../../src/portal/employer";
import type { EmployerSession } from "../../src/portal/employer";

describe("buildSessionInfo", () => {
  it("exposes the user and expiry but never the access token", () => {
    const session: EmployerSession = {
      accessToken: "secret-token",
      accessTokenExpires: 1_900_000_000_000,
      user: {
        id: "1",
        username: "u",
        email: "u@x.org",
        lastName: "L",
        otherNames: "O",
        language: "en",
        emailVerified: true,
        permissions: [],
        groups: [],
        policyHolders: [],
      },
    };
    const info = buildSessionInfo(session);
    expect(info.expiresAt).toBe(1_900_000_000_000);
    expect(info.user.username).toBe("u");
    expect(JSON.stringify(info)).not.toContain("secret-token");
  });
});
