import { describe, expect, it } from "vitest";
import { UserInfo } from "../../src/auth/types";
import {
  mapSessionUser,
  normalizeEmployerUser,
  sdkCredentials,
  switchEmployer,
} from "../../src/portal/employer";
import type { EmployerSession } from "../../src/portal/employer";

const baseUser = {
  id: 7,
  username: "jdoe",
  email: "j@example.org",
  last_name: "Doe",
  other_names: "Jane",
  permissions: ["api_auth.view_employees", "api_auth.add_claims", "view_contracts"],
};

/** Session mapping wires SDK rules into the cookie shape (rules themselves are SDK-tested). */
describe("mapSessionUser", () => {
  it("stores employer-portal permissions and no employer for unlinked users", () => {
    const user = mapSessionUser(UserInfo.fromJSON({ ...baseUser, policy_holder: {} }));
    expect(user.policyHolder).toBeUndefined();
    expect(user.policyHolders).toEqual([]);
    expect(user.permissions.sort()).toEqual(["api_auth.view_contracts", "api_auth.view_employees"]);
    expect(user.groups).toEqual([]);
    expect(user.emailVerified).toBe(true);
  });

  it("keeps the preferred employer and all linked employers", () => {
    const user = mapSessionUser(
      UserInfo.fromJSON({
        ...baseUser,
        policy_holders: [
          { code: "PH1", trade_name: "Acme" },
          { code: "PH2", trade_name: "Globex" },
        ],
      }),
      "PH2"
    );
    expect(user.policyHolders.map((p) => p.code)).toEqual(["PH1", "PH2"]);
    expect(user.policyHolder).toEqual({ code: "PH2", tradeName: "Globex", email: undefined });
  });
});

describe("switchEmployer", () => {
  const session: EmployerSession = {
    accessToken: "tok",
    accessTokenExpires: 1,
    user: mapSessionUser(
      UserInfo.fromJSON({
        ...baseUser,
        policy_holders: [
          { code: "PH1", trade_name: "Acme" },
          { code: "PH2", trade_name: "Globex" },
        ],
      }),
      "PH1"
    ),
  };

  it("switches to a linked employer", () => {
    const result = switchEmployer(session, " PH2 ");
    expect(result.ok && result.session.user.policyHolder?.code).toBe("PH2");
    expect(result.ok && sdkCredentials(result.session)).toEqual({ token: "tok", policyHolderCode: "PH2" });
  });

  it("rejects an employer the account is not linked to", () => {
    expect(switchEmployer(session, "NOPE")).toMatchObject({ ok: false, status: 400 });
  });
});

describe("normalizeEmployerUser", () => {
  it("fills defaults missing from old cookies", () => {
    const user = normalizeEmployerUser({ id: "1" } as never);
    expect(user).toMatchObject({ emailVerified: true, permissions: [], groups: [], policyHolders: [] });
  });
});
