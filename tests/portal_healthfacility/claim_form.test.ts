import { describe, expect, it } from "vitest";
import {
  bulkRowWriteBody,
  claimEditWriteBody,
  claimFormValuesFromItem,
  emptyClaimBulkRowValues,
  emptyClaimFormValues,
  validateBulkRowValues,
  validateClaimFormValues,
} from "../../src/portal/healthfacility/claim-form";
import type { ClaimListItemDto } from "../../src/portal/healthfacility/types";

const msgs = { required: "req", atLeastOneLine: "line" };

describe("claim form", () => {
  it("validates required fields and lines", () => {
    const v = emptyClaimFormValues();
    expect(validateClaimFormValues(v, msgs)).toEqual({ dateFrom: "req", primaryDiagnosisCode: "req", "services.0.code": "req", lines: "line" });
    v.services[0] = { ...v.services[0], code: "S1" };
    v.dateFrom = "2026-01-01";
    v.primaryDiagnosisCode = "A00";
    expect(validateClaimFormValues(v, msgs)).toEqual({});
  });
  it("flags a partial line without code", () => {
    const v = emptyClaimFormValues();
    v.dateFrom = "d";
    v.primaryDiagnosisCode = "x";
    v.items = [{ code: "", name: "", category: "item", quantity: "2", unitPrice: "" }];
    v.services = [];
    expect(validateClaimFormValues(v, msgs)["items.0.code"]).toBe("req");
  });
  it("builds values from an item and the edit body", () => {
    const item = {
      id: "1", code: "C1", status: "Entered", patientChfId: "P", dateFrom: "2026-02-03T00:00:00Z",
      diagnoses: [{ sequence: 1, code: "A00", display: "Cholera" }],
      items: [{ sequence: 1, code: "S1", category: "service", quantity: 2, unitPrice: 5 }],
    } as ClaimListItemDto;
    const values = claimFormValuesFromItem(item, "encounter");
    expect(values.visitType).toBe("C");
    expect(values.services[0].quantity).toBe("2");
    const body = claimEditWriteBody(item, values, "encounter");
    expect(body.items).toEqual([{ code: "S1", category: "service", quantity: 2, unitPrice: 5 }]);
    expect(body.diagnoses).toHaveLength(1);
  });
  it("validates bulk rows and builds the row body", () => {
    const row = emptyClaimBulkRowValues("O");
    expect(Object.keys(validateBulkRowValues(row, msgs)).sort()).toEqual(["dateFrom", "lines", "patientChfId", "primaryDiagnosisCode", "services.0.code"]);
    row.patientChfId = " P1 ";
    row.dateFrom = "2026-01-01";
    row.primaryDiagnosisCode = "A00";
    row.services[0].code = "S1";
    const body = bulkRowWriteBody(row, "claim");
    expect(body.patientChfId).toBe("P1");
    expect(body.dateTo).toBe("2026-01-01");
  });
});
