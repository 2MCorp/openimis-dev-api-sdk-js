import { describe, expect, it } from "vitest";
import FormalSectorDevAPIClient from "../src/formalsector/index";
import {
  ContractListFilters,
  EmployeeBinaryUploadQuery,
  EmployeeClaimListFilters,
  EmployeeListFilters,
  FhirListParams,
  InsurancePlanListFilters,
} from "../src/formalsector/types";
import { BinaryModel } from "../src/models/binary";
import { ContractModel } from "../src/models/contract";
import { EmployeeModel } from "../src/models/employee";
import {
  MockHttpClient,
  collectionBundle,
  searchBundle,
} from "./helpers/mockHttpClient";
import {
  sampleClaimFhir,
  sampleContractFhir,
  sampleEmployeeFhir,
  sampleGroupFhir,
  sampleInsurancePlanFhir,
  samplePatientFhir,
  samplePaymentReconciliationFhir,
  sampleStaffFhir,
} from "./fixtures/samples";

function createClient(http = new MockHttpClient()) {
  return {
    http,
    client: new FormalSectorDevAPIClient(http.asHttpClient()),
  };
}

describe("FormalSectorDevAPIClient", () => {
  describe("searchEmployees", () => {
    it("searches public employee endpoints with skipAuth", async () => {
      const { http, client } = createClient();
      http.on(
        "GET",
        "/policy-holder-dev-api/search-employee/",
        samplePatientFhir()
      );

      const byChf = await client.searchEmployees.getByChfId("CHF123456");
      expect(byChf.chfId).toBe("CHF123456");
      expect(http.lastCall?.path).toContain("identifier=CHF123456");
      expect(http.lastCall?.options?.skipAuth).toBe(true);

      http.on(
        "GET",
        "/policy-holder-dev-api/search-employee/CHF123456/",
        samplePatientFhir()
      );
      await client.searchEmployees.getByIdentifier("CHF123456");
      expect(http.lastCall?.options?.skipAuth).toBe(true);
    });
  });

  describe("employees", () => {
    it("lists, gets, creates, and batch-uploads employees", async () => {
      const { http, client } = createClient();
      const fhir = sampleEmployeeFhir();
      http
        .on(
          "GET",
          "/policy-holder-dev-api/employees/",
          searchBundle("Patient", [fhir])
        )
        .on("GET", "/policy-holder-dev-api/employees/42/", fhir)
        .on("POST", "/policy-holder-dev-api/employees/", fhir)
        .on(
          "POST",
          "/policy-holder-dev-api/employees/batch-upload/",
          collectionBundle([fhir])
        )
        .on(
          "POST",
          "/policy-holder-dev-api/employees/upload-binary/",
          collectionBundle([fhir])
        );

      const page = await client.employees.list(
        new EmployeeListFilters(0, 25, "CHF999", "Smith", "Jane")
      );
      expect(page.items[0]?.lastName).toBe("Smith");
      expect(page.items[0]?.chfId).toBe("CHF999");
      expect(http.lastCall?.path).toContain("_chfid=CHF999");
      expect(http.lastCall?.path).toContain("_last_name=Smith");
      expect(http.lastCall?.path).toContain("_count=25");

      const got = await client.employees.get("42");
      expect(got.employeeId).toBe("42");

      const model = new EmployeeModel("42", "Smith", "Jane", "CHF999");
      const created = await client.employees.create(model);
      expect(created.chfId).toBe("CHF999");
      expect((http.lastCall?.body as fhir4.Patient).resourceType).toBe("Patient");

      const batch = await client.employees.batchUpload([model]);
      expect(batch).toHaveLength(1);
      expect((http.lastCall?.body as fhir4.Bundle).type).toBe("collection");

      const uploaded = await client.employees.uploadBinary(
        new BinaryModel("text/csv", "Y29udGVudA==", "15"),
        new EmployeeBinaryUploadQuery("15", "CP01", "Basic")
      );
      expect(uploaded).toHaveLength(1);
      expect(http.lastCall?.path).toContain(
        "policy_holder_contribution_plan_id=15"
      );
      expect((http.lastCall?.body as fhir4.Binary).resourceType).toBe("Binary");
    });
  });

  describe("groups", () => {
    it("fetches a group by employee uuid and returns null for empty body", async () => {
      const { http, client } = createClient();
      http.on("GET", "/policy-holder-dev-api/groups/", sampleGroupFhir());

      const group = await client.groups.getByEmployeeUuid(
        "33333333-3333-4333-8333-333333333333"
      );
      expect(group?.id).toBe("group-1");
      expect(http.lastCall?.path).toContain(
        "_employee_uuid=33333333-3333-4333-8333-333333333333"
      );

      http.on("GET", "/policy-holder-dev-api/groups/", null);
      const missing = await client.groups.getByEmployeeUuid("missing");
      expect(missing).toBeNull();
    });
  });

  describe("contracts", () => {
    it("lists, gets, and creates contracts", async () => {
      const { http, client } = createClient();
      const fhir = sampleContractFhir();
      http
        .on(
          "GET",
          "/policy-holder-dev-api/contracts/",
          searchBundle("Contract", [fhir])
        )
        .on("GET", "/policy-holder-dev-api/contracts/contract-1/", fhir)
        .on("POST", "/policy-holder-dev-api/contracts/", fhir);

      const page = await client.contracts.list(
        new ContractListFilters(0, 10, "CTR-001", "2024-01-01")
      );
      expect(page.items[0]?.code).toBe("CTR-001");
      expect(http.lastCall?.path).toContain("code=CTR-001");
      expect(http.lastCall?.path).toContain("date_approved=2024-01-01");

      const got = await client.contracts.get("contract-1");
      expect(got.id).toBe("contract-1");

      const created = await client.contracts.create(
        new ContractModel("contract-1", "CTR-001", "executed")
      );
      expect(created.code).toBe("CTR-001");
      expect((http.lastCall?.body as fhir4.Contract).resourceType).toBe(
        "Contract"
      );
    });
  });

  describe("insurancePlans / payments / staffs", () => {
    it("lists and gets insurance plans", async () => {
      const { http, client } = createClient();
      const fhir = sampleInsurancePlanFhir();
      http
        .on(
          "GET",
          "/policy-holder-dev-api/insurance-plans/",
          searchBundle("InsurancePlan", [fhir])
        )
        .on("GET", "/policy-holder-dev-api/insurance-plans/15/", fhir);

      const page = await client.insurancePlans.list(
        new InsurancePlanListFilters(0, 5, "FS-BASIC")
      );
      expect(page.items[0]?.name).toBe("Formal Sector Plan");
      expect(http.lastCall?.path).toContain("code=FS-BASIC");

      const got = await client.insurancePlans.get("15");
      expect(got.id).toBe("15");
    });

    it("lists and gets payments", async () => {
      const { http, client } = createClient();
      const fhir = samplePaymentReconciliationFhir();
      http
        .on(
          "GET",
          "/policy-holder-dev-api/payments/",
          searchBundle("PaymentReconciliation", [fhir])
        )
        .on("GET", "/policy-holder-dev-api/payments/pay-1/", fhir);

      const page = await client.payments.list(new FhirListParams(0, 10));
      expect(page.items[0]?.id).toBe("pay-1");
      expect(page.items[0]?.amount).toBe(250);

      const got = await client.payments.get("pay-1");
      expect(got.status).toBe("active");
    });

    it("lists and gets staffs", async () => {
      const { http, client } = createClient();
      const fhir = sampleStaffFhir();
      http
        .on(
          "GET",
          "/policy-holder-dev-api/staffs/",
          searchBundle("OrganizationAffiliation", [fhir])
        )
        .on("GET", "/policy-holder-dev-api/staffs/staff-uuid-1/", fhir);

      const page = await client.staffs.list();
      expect(page.items[0]?.id).toBe("7");
      expect(page.items[0]?.uuid).toBe("staff-uuid-1");

      const got = await client.staffs.get("staff-uuid-1");
      expect(got.active).toBe(true);
      expect(got.uuid).toBe("staff-uuid-1");
    });
  });

  describe("employeeClaims", () => {
    it("requires PolicyHolderInsuree identifier and lists claims", async () => {
      const { http, client } = createClient();
      http.on(
        "GET",
        "/policy-holder-dev-api/employee-claims/",
        searchBundle("Claim", [sampleClaimFhir()])
      );

      await expect(
        client.employeeClaims.list(new EmployeeClaimListFilters())
      ).rejects.toThrow(/identifier/);

      const page = await client.employeeClaims.list(
        new EmployeeClaimListFilters(
          0,
          10,
          "44444444-4444-4444-8444-444444444444"
        )
      );
      expect(page.items[0]?.code).toBe("CLM-001");
      expect(http.lastCall?.path).toContain(
        "identifier=44444444-4444-4444-8444-444444444444"
      );

      http.on(
        "GET",
        "/policy-holder-dev-api/employee-claims/CLM-001/",
        sampleClaimFhir()
      );
      const got = await client.employeeClaims.get("CLM-001");
      expect(got.patientChfId).toBe("CHF123456");
    });
  });
});
