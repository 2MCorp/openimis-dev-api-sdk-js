import { describe, expect, it } from "vitest";
import { filterHealthPackages, isNotFoundMessage } from "../../src/portal/employer/package_search";
import type { HealthPackageDto } from "../../src/portal/employer/dto";

const pkgs: HealthPackageDto[] = [
  { id: "1", name: "Gold", bundleCode: "BND-1", plans: [{ name: "Inpatient", code: "IP" }] },
  { id: "2", name: "Silver", plans: [{ code: "OPD" }, {}] },
];

describe("filterHealthPackages", () => {
  it("returns all for an empty query", () => {
    expect(filterHealthPackages(pkgs, "  ")).toHaveLength(2);
  });
  it("matches name, bundle code and plan name/code case-insensitively", () => {
    expect(filterHealthPackages(pkgs, "gold").map((p) => p.id)).toEqual(["1"]);
    expect(filterHealthPackages(pkgs, "bnd").map((p) => p.id)).toEqual(["1"]);
    expect(filterHealthPackages(pkgs, "inpat").map((p) => p.id)).toEqual(["1"]);
    expect(filterHealthPackages(pkgs, "opd").map((p) => p.id)).toEqual(["2"]);
    expect(filterHealthPackages(pkgs, "zzz")).toEqual([]);
  });
});

describe("isNotFoundMessage", () => {
  it("detects not-found messages", () => {
    expect(isNotFoundMessage("Contract not found.")).toBe(true);
    expect(isNotFoundMessage("Boom")).toBe(false);
    expect(isNotFoundMessage(null)).toBe(false);
  });
});
