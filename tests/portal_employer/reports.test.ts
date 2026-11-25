import { describe, expect, it } from "vitest";
import { ApiResponse } from "../../src/api_response";
import { EmployeeModel } from "../../src/models/employee";
import {
  handleReportDownload,
  isReportKind,
  memberReportColumns,
  reportFilename,
  serializeEmployee,
} from "../../src/portal/employer";
import type { ReportResult } from "../../src/portal/employer";
import { FhirSearchPage } from "../../src/models/pagination";
import { fakeSdk } from "./helpers";

const employee = (chf: string, rule: Record<string, number>) => {
  const e = new EmployeeModel(`u-${chf}`, "Doe", "Jane", chf);
  e.calculationRule = rule;
  e.contributionPlanBundleDisplay = "FSB/Formal Basic";
  return e;
};

describe("reports", () => {
  it("knows the report kinds", () => {
    expect(isReportKind("members")).toBe(true);
    expect(isReportKind("secrets")).toBe(false);
  });

  it("adds one humanised column per calculation input between the fixed columns", () => {
    const rows = [employee("C1", { annual_income: 10 }), employee("C2", { bonus: 5 })].map(serializeEmployee);
    expect(memberReportColumns(rows).map((c) => c.header)).toEqual([
      "CHF ID",
      "Last name",
      "Other names",
      "Birth date",
      "Annual income",
      "Bonus",
      "Health package",
      "Package code",
    ]);
  });

  it("builds a BOM-prefixed members CSV with download headers", async () => {
    const sdk = fakeSdk({
      formalSector: {
        employees: {
          list: async () => ApiResponse.ok(new FhirSearchPage(1, [employee("C1", { income: 4500 })])),
        },
      },
    });
    const result = (await handleReportDownload(sdk, "members", new Date("2026-03-04T10:00:00Z"))) as Extract<
      ReportResult,
      { status: 200 }
    >;
    expect(result.status).toBe(200);
    expect(result.file.filename).toBe("members-2026-03-04.csv");
    expect(result.file.content.startsWith("﻿")).toBe(true);
    expect(result.file.content).toContain("CHF ID,Last name,Other names,Birth date,Income,Health package,Package code");
    expect(result.file.content).toContain("C1,Doe,Jane,,4500,Formal Basic,FSB");
    expect(result.file.headers["Content-Disposition"]).toBe('attachment; filename="members-2026-03-04.csv"');
    expect(result.file.headers["Cache-Control"]).toBe("no-store");
  });

  it("escapes formula injection in cells", async () => {
    const e = new EmployeeModel("u1", "=cmd()", "Jane", "C1");
    const sdk = fakeSdk({
      formalSector: { employees: { list: async () => ApiResponse.ok(new FhirSearchPage(1, [e])) } },
    });
    const result = (await handleReportDownload(sdk, "members")) as Extract<ReportResult, { status: 200 }>;
    expect(result.file.content).toContain("'=cmd()");
  });

  it("fails with a sanitised envelope for unknown kinds and backend errors", async () => {
    expect(await handleReportDownload(fakeSdk({}), "nope")).toEqual({
      status: 404,
      body: { success: false, error: "Unknown report." },
    });
    const sdk = fakeSdk({
      formalSector: { insurancePlans: { listPackages: async () => ApiResponse.fail(403, "denied") } },
    });
    expect(await handleReportDownload(sdk, "health-packages")).toMatchObject({
      status: 403,
      body: { success: false },
    });
  });

  it("names files by kind and date", () => {
    expect(reportFilename("payments", new Date("2026-01-02T00:00:00Z"))).toBe("payments-2026-01-02.csv");
  });
});
