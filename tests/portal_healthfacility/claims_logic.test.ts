import { describe, expect, it } from "vitest";
import { ClaimModel } from "../../src/models/claim";
import {
  BULK_CSV_HEADERS,
  buildBulkCsv,
  catalogCodeNameOption,
  catalogOptionToSelect,
  claimModelFromBody,
  claimPatientLabel,
  claimPatientParts,
  claimRecordId,
  enrichClaimsWithPatientNames,
  formatLineMoney,
  isClaimEditableStatus,
  isClaimSubmittableStatus,
  isItemLineCategory,
  isServiceLineCategory,
  lineTotal,
  loadClaimsForSubmit,
  normalizeClaimPatientName,
  parseSubmitIds,
  resolveCatalogUnitPrice,
  rewriteBulkCsvForKind,
  sampleBulkCsv,
  searchCatalogOptions,
  splitClaimLines,
  toDateInputValue,
  unitPriceFromSelectOption,
} from "../../src/portal/healthfacility";
import { ApiResponse } from "../../src/api_response";
import { FhirSearchPage } from "../../src/models/pagination";
import { samplePatientFhir } from "../fixtures/samples";
import { createMockSdk } from "./helpers";

describe("claim status + ids", () => {
  it("knows editable and submittable statuses", () => {
    for (const s of ["entered", "Rejected", "1", "2"]) expect(isClaimEditableStatus(s)).toBe(true);
    for (const s of ["checked", "approved", "", undefined, null]) expect(isClaimEditableStatus(s)).toBe(false);
    expect(isClaimSubmittableStatus("ENTERED")).toBe(true);
    expect(isClaimSubmittableStatus("rejected")).toBe(false);
    expect(isClaimSubmittableStatus("2")).toBe(true);
  });

  it("parses and de-duplicates submit ids", () => {
    expect(parseSubmitIds({ ids: [" a ", "a", "b", "", null] })).toEqual(["a", "b"]);
    expect(parseSubmitIds({ ids: [] })).toBeNull();
    expect(parseSubmitIds(null)).toBeNull();
    expect(parseSubmitIds({ ids: "a" })).toBeNull();
  });

  it("picks the canonical record id", () => {
    const uuid = "22222222-2222-4222-8222-222222222222";
    expect(claimRecordId({ uuid, id: "5", code: "C" })).toBe(uuid);
    expect(claimRecordId({ id: uuid, code: "C" })).toBe(uuid);
    expect(claimRecordId({ id: "5", code: "C" })).toBe("C");
    expect(claimRecordId({ id: "5" })).toBe("5");
  });

  it("formats patient labels", () => {
    expect(normalizeClaimPatientName("Doe/John")).toBe("John Doe");
    expect(claimPatientParts({ patientName: "John Doe", patientChfId: "C1" })).toEqual({ name: "John Doe", chf: "C1" });
    expect(claimPatientParts({ patientName: "C1", patientChfId: "C1" })).toEqual({ name: "", chf: "C1" });
    expect(claimPatientLabel({ patientName: "John Doe", patientChfId: "C1" })).toBe("John Doe (C1)");
    expect(claimPatientLabel({})).toBe("—");
    expect(toDateInputValue("2024-05-03T10:00:00Z")).toBe("2024-05-03");
    expect(toDateInputValue("garbage-date-x")).toBe("garbage-da");
    expect(toDateInputValue(undefined)).toBe("");
  });
});

describe("claimModelFromBody", () => {
  it("drops blank codes, numbers sequences and defaults fields", () => {
    const m = claimModelFromBody({
      patientChfId: " CHF1 ",
      dateFrom: "2024-02-01",
      diagnoses: [{ code: "A00", display: " Cholera " }, { code: " " }, { code: "B01" }],
      items: [
        { code: "S1", quantity: 2, unitPrice: 5 },
        { code: "" },
        { code: "M1", category: "item", quantity: "3" as unknown as number },
      ],
    });
    expect(m.status).toBe("ENTERED");
    expect(m.patientChfId).toBe("CHF1");
    expect(m.created).toBe("2024-02-01");
    expect(m.diagnoses.map((d) => [d.sequence, d.code, d.display])).toEqual([
      [1, "A00", "Cholera"],
      [3, "B01", undefined],
    ]);
    expect(m.items.map((i) => [i.sequence, i.category, i.quantity])).toEqual([
      [1, "service", 2],
      [3, "item", 3],
    ]);
  });
});

describe("loadClaimsForSubmit", () => {
  it("fails on a missing claim and on a claim without patient", async () => {
    const good = new ClaimModel("1", "C1", "ENTERED", "CHF1");
    const noPatient = new ClaimModel("2", "C2", "ENTERED", " ");
    const get = async (id: string) =>
      id === "1"
        ? { success: true, data: good }
        : id === "2"
          ? { success: true, data: noPatient }
          : { success: false, statusCode: "404", data: null };
    expect(await loadClaimsForSubmit(get, ["1"])).toEqual({ claims: [good] });
    expect(await loadClaimsForSubmit(get, ["1", "9"])).toEqual({
      status: 404,
      error: "Could not load claim 9 for submit.",
    });
    expect(await loadClaimsForSubmit(get, ["2"])).toEqual({
      status: 400,
      error: "Claim C2 is missing a patient CHF ID and cannot be submitted.",
    });
  });
});

describe("claim lines", () => {
  it("classifies categories and splits lines", () => {
    expect(isItemLineCategory("Medication")).toBe(true);
    expect(isServiceLineCategory("")).toBe(true);
    expect(isServiceLineCategory("item")).toBe(false);
    expect(isServiceLineCategory("weird")).toBe(false);
    const lines = [
      { sequence: 1, code: "a", category: "service" },
      { sequence: 2, code: "b", category: "m" },
      { sequence: 3, code: "c", category: "" },
    ];
    const { services, items } = splitClaimLines(lines);
    expect(services.map((l) => l.code)).toEqual(["a", "c"]);
    expect(items.map((l) => l.code)).toEqual(["b"]);
    expect(splitClaimLines(null)).toEqual({ services: [], items: [] });
  });

  it("computes totals and money strings", () => {
    expect(lineTotal(2, 5)).toBe(10);
    expect(lineTotal(undefined, 5)).toBeNull();
    expect(lineTotal(Number.NaN, 5)).toBeNull();
    expect(formatLineMoney(undefined)).toBe("—");
    expect(formatLineMoney(1234.5, "₦")).toMatch(/^₦1.234.50$|^₦1,234\.50$/);
    expect(formatLineMoney(10, "USD")).toMatch(/USD$/);
    expect(formatLineMoney(10)).toMatch(/10[.,]00/);
  });
});

describe("bulk csv", () => {
  it("builds a csv with defaults per kind", () => {
    const csv = buildBulkCsv(
      [
        {
          patientChfId: " 1 ",
          dateFrom: "2024-01-01",
          primaryDiagnosisCode: "A00",
          serviceCode: "S1",
          itemCode: "I1",
          itemQuantity: 2,
          visitType: "C",
        },
      ],
      "claim",
      "HF1"
    );
    const [header, row] = csv.trim().split("\n");
    expect(header).toBe(BULK_CSV_HEADERS.join(","));
    // claims cannot be visit type C → O; hf code defaulted; service qty/price default
    expect(row).toBe("1,HF1,2024-01-01,2024-01-01,2024-01-01,O,A00,,I1,2,0,S1,1,0");
    const enc = buildBulkCsv(
      [{ patientChfId: "1", dateFrom: "d", primaryDiagnosisCode: "A", serviceCode: "S", visitType: "E" }],
      "encounter",
      "HF1"
    );
    expect(enc.split("\n")[1].split(",")[5]).toBe("C");
  });

  it("escapes commas, quotes and newlines", () => {
    const csv = buildBulkCsv(
      [{ patientChfId: 'a,"b"', dateFrom: "d", primaryDiagnosisCode: "A", serviceCode: "S" }],
      "claim",
      "HF"
    );
    expect(csv).toContain('"a,""b"""');
  });

  it("round-trips the sample through rewrite without issues", () => {
    const sample = sampleBulkCsv("claim", "");
    const out = rewriteBulkCsvForKind(sample, "claim", "HF9");
    expect(out.issues).toEqual([]);
    expect(out.csv.split("\n")[1]).toContain("HF001");
  });

  it("reports missing columns, empty files and per-row problems", () => {
    expect(rewriteBulkCsvForKind("a,b", "claim", "").issues[0].message).toMatch(/header and at least one/);
    expect(rewriteBulkCsvForKind("a,b\n1,2", "claim", "").issues[0].message).toMatch(/Missing required columns/);
    const header = BULK_CSV_HEADERS.join(",");
    const bad = `﻿${header}\r\n,HF,d,d,d,C,,, , , ,,,\r\n`;
    const claimOut = rewriteBulkCsvForKind(bad, "claim", "");
    const messages = claimOut.issues.map((i) => i.message);
    expect(messages).toContain("insuree_chf_id is required.");
    expect(messages).toContain("icd_code is required.");
    expect(messages.some((m) => /visit_type C/.test(m))).toBe(true);
    expect(messages).toContain("Provide service_code and/or item_code.");
    expect(claimOut.issues.every((i) => i.row === 1)).toBe(true);
    // encounters force visit type C instead of failing
    const encOut = rewriteBulkCsvForKind(`${header}\n1,HF,d,d,d,O,A00,,,,,S1,1,1\n`, "encounter", "");
    expect(encOut.issues).toEqual([]);
    expect(encOut.csv.split("\n")[1].split(",")[5]).toBe("C");
  });

  it("fills a missing facility code and parses quoted cells", () => {
    const header = BULK_CSV_HEADERS.join(",");
    const out = rewriteBulkCsvForKind(`${header}\n1,,d,d,d,O,A00,,,,,"S,1",1,1\n`, "claim", "HFX");
    expect(out.issues).toEqual([]);
    expect(out.csv.split("\n")[1]).toContain(",HFX,");
    expect(out.csv.split("\n")[1]).toContain('"S,1"');
  });
});

describe("catalog", () => {
  const page = (items: string[], hasNext = false, total = items.length) =>
    ApiResponse.ok(new FhirSearchPage(total, items, "s", hasNext ? "n" : undefined));
  const base = {
    mapItem: (c: string) => ({ value: c, label: `L-${c}`, code: c }),
    createParams: undefined,
  };

  it("returns the first page unfiltered without a query", async () => {
    const res = await searchCatalogOptions({
      ...base,
      q: "",
      list: async () => page(["a", "b"], true, 10),
    });
    expect(res).toEqual({
      total: 10,
      items: [
        { value: "a", label: "L-a", code: "a" },
        { value: "b", label: "L-b", code: "b" },
      ],
      hasNext: true,
      hasPrevious: false,
    });
  });

  it("filters across pages and stops at the last page", async () => {
    let calls = 0;
    const res = await searchCatalogOptions({
      ...base,
      q: " B ",
      list: async () => {
        calls++;
        return calls === 1 ? page(["a", "b1"], true) : page(["b2"], false);
      },
    });
    expect(calls).toBe(2);
    expect(res.items.map((i) => i.value)).toEqual(["b1", "b2"]);
    expect(res.hasNext).toBe(false);
  });

  it("throws with the status when the first page fails and tolerates later failures", async () => {
    await expect(
      searchCatalogOptions({
        ...base,
        q: "",
        list: async () => ApiResponse.fail(403, "denied"),
      })
    ).rejects.toMatchObject({ statusCode: 403, message: "denied" });
    let n = 0;
    const res = await searchCatalogOptions({
      ...base,
      q: "a",
      list: async () => (++n === 1 ? page(["a"], true) : ApiResponse.fail(500, "x")),
    });
    expect(res.items.map((i) => i.value)).toEqual(["a"]);
  });

  it("builds options and resolves unit prices", async () => {
    expect(catalogCodeNameOption({ uuid: "u", code: "C", name: "N", unitPrice: "12.5" })).toEqual({
      value: "u",
      label: "C — N",
      code: "C",
      unitPrice: 12.5,
    });
    expect(catalogCodeNameOption({ id: "7", unitPrice: "" })).toMatchObject({ value: "7", label: "7", unitPrice: undefined });
    expect(unitPriceFromSelectOption({ value: "a", label: "a", unitPrice: 3 })).toBe("3");
    expect(unitPriceFromSelectOption(null)).toBe("");
    expect(catalogOptionToSelect({ value: "u", label: "x", code: "S1" })).toEqual({ value: "S1", label: "x", unitPrice: undefined });
    const fetched: string[] = [];
    const price = await resolveCatalogUnitPrice("service", { value: "S1", label: "x" }, async <T,>(url: string) => {
      fetched.push(url);
      return { total: 1, hasNext: false, hasPrevious: false, items: [{ value: "u", label: "x", code: "S1", unitPrice: 9 }] } as T;
    });
    expect(price).toBe("9");
    expect(fetched).toEqual(["/api/catalog/services?q=S1"]);
    expect(await resolveCatalogUnitPrice("item", { value: "S1", label: "x", unitPrice: 4 }, async () => { throw new Error("no"); })).toBe("4");
  });
});

describe("enrichClaimsWithPatientNames", () => {
  it("resolves names for CHF-only rows once per patient and keeps others", async () => {
    const { http, sdk } = createMockSdk();
    http.on("GET", "/health-facility-dev-api/search-patient/", samplePatientFhir());
    const claims = [
      { id: "1", code: "a", status: "x", patientChfId: "CHF123456", patientName: "CHF123456" },
      { id: "2", code: "b", status: "x", patientChfId: "CHF123456" },
      { id: "3", code: "c", status: "x", patientChfId: "CHF9", patientName: "Already Named" },
    ];
    const out = await enrichClaimsWithPatientNames(sdk, claims);
    expect(out[0].patientName).toBe("John Doe");
    expect(out[1].patientName).toBe("John Doe");
    expect(out[2].patientName).toBe("Already Named");
    expect(http.calls).toHaveLength(1);
  });

  it("returns the input untouched when nothing resolves", async () => {
    const { http, sdk } = createMockSdk();
    http.onError("GET", "/health-facility-dev-api/search-patient/", 404, "nope");
    const claims = [{ id: "1", code: "a", status: "x", patientChfId: "CHF1" }];
    expect(await enrichClaimsWithPatientNames(sdk, claims)).toBe(claims);
  });
});
