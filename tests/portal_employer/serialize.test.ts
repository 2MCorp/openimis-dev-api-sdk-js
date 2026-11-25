import { describe, expect, it } from "vitest";
import { ContractModel } from "../../src/models/contract";
import { EmployeeModel } from "../../src/models/employee";
import { PaymentReconciliationModel } from "../../src/models/payment";
import { PatientModel } from "../../src/models/patient";
import { StaffModel } from "../../src/models/staff";
import {
  serializeContract,
  serializeEmployee,
  serializeInsuree,
  serializePayment,
  serializeSearchPage,
  serializeStaff,
} from "../../src/portal/employer";

/** Serializers copy SDK-derived values into plain DTOs (rules are tested elsewhere in the SDK). */
describe("serializers", () => {
  it("exposes the SDK bundle code and name for employees", () => {
    const model = new EmployeeModel("uuid-1", "Doe", "Jane", "070707092");
    model.calculationRule = { income: 4500 };
    model.contributionPlanBundleDisplay = "FSB/Formal Basic";
    expect(serializeEmployee(model)).toMatchObject({
      id: "uuid-1",
      fullName: "Jane Doe",
      calculationRule: { income: 4500 },
      planCode: "FSB",
      planName: "Formal Basic",
    });
  });

  it("exposes SDK contract state, group and state-dependent amount", () => {
    const model = new ContractModel("c1", "C-1", "draft");
    model.amountNotified = 120;
    model.amountDue = 300;
    model.currency = "$";
    expect(serializeContract(model)).toMatchObject({
      status: "draft",
      stateGroup: "draft_like",
      editable: true,
      amount: 120,
      amountDue: 300,
      currency: "$",
    });
  });

  it("exposes the SDK payment bucket", () => {
    expect(serializePayment(new PaymentReconciliationModel("p1", "paid")).statusKey).toBe("paid");
  });

  it("resolves the insuree photo against the API base and omits an empty address", () => {
    const patient = new PatientModel("1", "CHF1");
    patient.photoUrl = "/media/p.jpg";
    const dto = serializeInsuree(patient, "http://host/api");
    expect(dto.photoUrl).toBe("http://host/media/p.jpg");
    expect(dto.address).toBeNull();
    expect(dto.isHead).toBe(false);
  });

  it("falls back to username for staff display names and treats missing active as active", () => {
    const dto = serializeStaff(new StaffModel("1", "", undefined, "bob"));
    expect(dto).toMatchObject({ uuid: "1", active: true, displayName: "bob" });
  });

  it("maps search pages item by item", () => {
    const page = { total: 3, items: [1, 2], hasNext: true, hasPrevious: false } as never;
    expect(serializeSearchPage<number, string>(page, (n) => `#${n}`)).toEqual({
      total: 3,
      items: ["#1", "#2"],
      hasNext: true,
      hasPrevious: false,
    });
  });
});
