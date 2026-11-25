import { describe, expect, it } from "vitest";
import {
  buildPreauthFormValues,
  emptyPreauthFormValues,
  preauthEditId,
  preauthInitialFromItem,
  preauthRequestBody,
  validatePreauthForm,
} from "../../src/portal/healthfacility/preauth-form";

describe("preauth form helpers", () => {
  it("validates the four required fields", () => {
    const errs = validatePreauthForm(emptyPreauthFormValues(), "Required");
    expect(Object.keys(errs).sort()).toEqual(["hfToId", "patientChfId", "primaryDiagnosisCode", "serviceCode"]);
    const ok = buildPreauthFormValues({ patientChfId: "1", hfToId: "2", primaryDiagnosisCode: "A", serviceCode: "S" });
    expect(validatePreauthForm(ok, "Required")).toEqual({});
    expect(validatePreauthForm({ ...ok, serviceCode: "  " }, "R")).toEqual({ serviceCode: "R" });
  });
  it("builds request bodies and initial values", () => {
    const init = preauthInitialFromItem({
      id: "5",
      uuid: "u-1",
      status: "entered",
      patientChfId: "C1",
      service: { code: "S1", name: "Svc" },
    });
    expect(init.serviceName).toBe("Svc");
    const body = preauthRequestBody(init, { id: init.id, uuid: init.uuid });
    expect(body).toMatchObject({ patientChfId: "C1", uuid: "u-1", id: "5" });
    expect(preauthEditId({ id: "5", uuid: "u-1" })).toBe("u-1");
    expect(preauthEditId({})).toBeUndefined();
    expect(preauthRequestBody(emptyPreauthFormValues())).not.toHaveProperty("uuid");
  });
});
