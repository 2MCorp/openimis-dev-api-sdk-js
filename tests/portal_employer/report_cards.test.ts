import { describe, expect, it } from "vitest";
import { availableReportCards, REPORT_CARDS } from "../../src/portal/employer/report_cards";
import { formatPermission } from "../../src/portal/common/user_display";

describe("report cards", () => {
  it("filters by access", () => {
    expect(availableReportCards(null)).toEqual([]);
    expect(availableReportCards({ members: true, packages: true }).map((r) => r.kind)).toEqual(["members", "health-packages"]);
    expect(REPORT_CARDS).toHaveLength(4);
  });
  it("formats permissions", () => {
    expect(formatPermission("api_auth.view_ph_portal")).toBe("view ph portal");
  });
});
