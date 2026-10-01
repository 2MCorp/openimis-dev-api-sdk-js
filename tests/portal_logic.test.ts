import { describe, expect, it } from "vitest";
import DashboardDevAPIClient from "../src/dashboard/index";
import { normalizeDashboardQuery } from "../src/dashboard/policy_holder_views";
import EnrollmentDevAPIClient from "../src/enrollment/index";
import {
  isOpenEnrollmentStatus,
  validatePolicyHolderRegistration,
} from "../src/enrollment/enrollment_ops";
import FormalSectorDevAPIClient from "../src/formalsector/index";
import {
  contractStateGroup,
  groupContractStateCounts,
  isContractEditable,
  normalizeContractState,
} from "../src/formalsector/contract_states";
import { validateContractDraft } from "../src/formalsector/contract_ops";
import { employeeUploadContentType } from "../src/formalsector/employee_ops";
import { classifyPaymentStatus } from "../src/formalsector/payment_status";
import {
  PH_PORTAL_PERMISSIONS,
  hasPermission,
  slimPermissions,
} from "../src/auth/permissions";
import { UserInfo } from "../src/auth/types";
import { EmployeeModel } from "../src/models/employee";
import {
  EmployeeInsurancePlanModel,
  InsurancePlanDetailModel,
  dedupeInsurancePlans,
} from "../src/models/insurance_plan";
import { ContractModel, ContractTermModel } from "../src/models/contract";
import { FhirSearchPage } from "../src/models/pagination";
import { ApiResponse } from "../src/api_response";
import { collectAllPages } from "../src/utils/pagination";
import { toCsv } from "../src/utils/csv";
import { describeErrorDetails } from "../src/utils/errors";
import { resolvePatientPhotoSrc } from "../src/utils/photo";
import { MockHttpClient, searchBundle } from "./helpers/mockHttpClient";
import { ContractListFilters, EmployeeClaimListFilters, PaymentListFilters } from "../src/formalsector/types";
import {
  sampleEmployeeFhir,
  sampleInsurancePlanFhir,
  samplePatientFhir,
} from "./fixtures/samples";

describe("permissions", () => {
  it("slims the Django catalog to one portal and matches short names", () => {
    const perms = slimPermissions(
      ["api_auth.view_employees", "view_contracts", "api_auth.add_claims", "claim.gql_query"],
      PH_PORTAL_PERMISSIONS
    );
    expect(perms.sort()).toEqual(["api_auth.view_contracts", "api_auth.view_employees"]);
    expect(hasPermission({ permissions: perms }, "view_employees")).toBe(true);
    expect(hasPermission({ permissions: [] }, PH_PORTAL_PERMISSIONS.viewEmployees)).toBe(false);
  });
});

describe("UserInfo policy holders", () => {
  const base = { id: 1, username: "u", email: "", last_name: "", other_names: "" };

  it("treats policy_holder: {} as not linked", () => {
    const user = UserInfo.fromJSON({ ...base, policy_holder: {} });
    expect(user.policyHolder).toBeUndefined();
    expect(user.activePolicyHolder()).toBeUndefined();
  });

  it("resolves the active employer for multi-employer accounts", () => {
    // Backend sends `policy_holders` (and no `policy_holder`) when there are several.
    const user = UserInfo.fromJSON({
      ...base,
      policy_holders: [
        { code: "PH1", trade_name: "Acme" },
        { code: "PH2", trade_name: "" },
      ],
    });
    expect(user.linkedPolicyHolders().map((p) => p.code)).toEqual(["PH1", "PH2"]);
    expect(user.activePolicyHolder("PH2")?.displayName).toBe("PH2");
    expect(user.activePolicyHolder("GONE")?.code).toBe("PH1");
  });
});

describe("employee and package models", () => {
  it("splits the CODE/Name bundle display", () => {
    const e = new EmployeeModel("id", "Doe", "Jane", "CHF1");
    e.contributionPlanBundleDisplay = "FSB/Formal Basic";
    expect([e.contributionPlanBundleCode, e.contributionPlanBundleName]).toEqual([
      "FSB",
      "Formal Basic",
    ]);
  });

  it("keeps one package per bundle, preferring the most complete", () => {
    const pkg = (id: string, bundle: string, n: number) =>
      new EmployeeInsurancePlanModel(id, bundle, id, undefined, undefined, bundle, [
        ...Array.from({ length: n }, (_, i) => new InsurancePlanDetailModel(String(i))),
      ]);
    const kept = dedupeInsurancePlans([pkg("1", "A", 1), pkg("2", "A", 3), pkg("3", "B", 1)]);
    expect(kept.map((p) => p.id).sort()).toEqual(["2", "3"]);
  });
});

describe("insurance plan converter", () => {
  it("reads the backend's type-coded identifiers (bundle code, uuid, ids)", async () => {
    const typed = (system: string, value: string, code: string) => ({
      system: `http://example.com/fhir/${system}`,
      value,
      type: { coding: [{ code, system: "http://example.com/fhir/identifier-type" }] },
    });
    const http = new MockHttpClient();
    http.on(
      "GET",
      "/policy-holder-dev-api/insurance-plans/",
      searchBundle("InsurancePlan", [
        {
          resourceType: "InsurancePlan",
          id: "7",
          name: "SEAD",
          identifier: [
            typed("identifier", "7", "PHCPID"),
            typed("contributionplanbundle-identifier", "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", "CPBUUID"),
            typed("contributionplanbundle-identifier", "3", "CPBID"),
            typed("contributionplanbundle-code", "SEAD", "CPBCODE"),
          ],
          plan: [
            {
              identifier: [
                typed("identifier", "11", "CPBDID"),
                typed("contributionplan-identifier", "21", "CPID"),
                typed("contributionplan-code", "SEAD1", "CPCODE"),
              ],
              type: { coding: [{ code: "SEAD1", display: "SEAD - 1" }] },
            },
          ],
        },
      ])
    );
    const [pkg] = (await new FormalSectorDevAPIClient(http.asHttpClient()).insurancePlans.listPackages()).data!;
    expect(pkg).toMatchObject({
      policyHolderContributionPlanId: "7",
      contributionPlanBundleUuid: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      contributionPlanBundleId: "3",
      contributionPlanBundleCode: "SEAD",
    });
    expect(pkg.plans[0]).toMatchObject({ detailId: "11", contributionPlanId: "21", code: "SEAD1", name: "SEAD - 1" });
  });
});

describe("payment converter", () => {
  it("reads the backend's R5 amount/date and leaves missing transaction numbers empty", async () => {
    const http = new MockHttpClient();
    http.on(
      "GET",
      "/policy-holder-dev-api/payments/",
      searchBundle("PaymentReconciliation", [
        {
          resourceType: "PaymentReconciliation",
          id: "7d87aca1-f63b-4665-a776-76fe319742cf",
          status: "paid",
          created: "2026-08-06",
          date: "2026-08-06",
          amount: { value: 20000, currency: "NGN" },
          identifier: [
            { system: "urn:ietf:rfc:3986", value: "urn:uuid:7d87aca1-f63b-4665-a776-76fe319742cf" },
            { system: "http://openimis.org/CodeSystem/payment-receipt", value: "23121212121" },
          ],
          processNote: [{ type: "display", text: "231212121" }],
        },
      ])
    );
    const [payment] = (await new FormalSectorDevAPIClient(http.asHttpClient()).payments.list()).data!.items;
    expect(payment).toMatchObject({
      amount: 20000,
      currency: "NGN",
      paymentDate: "2026-08-06",
      receiptNo: "23121212121",
      contractCode: "231212121",
      transactionNo: undefined,
      statusKey: "paid",
    });
  });

  it("does not treat the backend's no-contract note as a contract code", async () => {
    const http = new MockHttpClient();
    http.on(
      "GET",
      "/policy-holder-dev-api/payments/",
      searchBundle("PaymentReconciliation", [
        { resourceType: "PaymentReconciliation", id: "p2", status: "pending", processNote: [{ text: "No contract details found" }] },
      ])
    );
    const [payment] = (await new FormalSectorDevAPIClient(http.asHttpClient()).payments.list()).data!.items;
    expect(payment.contractCode).toBeUndefined();
  });
});

describe("staff converter", () => {
  it("reads username, name, role and email from the backend's R5 OrganizationAffiliation", async () => {
    const http = new MockHttpClient();
    http.on(
      "GET",
      "/policy-holder-dev-api/staffs/",
      searchBundle("OrganizationAffiliation", [
        {
          resourceType: "OrganizationAffiliation",
          id: "b48d36f6-73b1-48ab-849f-b58fefd67930",
          active: true,
          identifier: [
            { system: "urn:ietf:rfc:3986", value: "b48d36f6-73b1-48ab-849f-b58fefd67930" },
            { system: "https://openimis.org/CodeSystem/username", value: "JHOS0011" },
          ],
          code: [{ coding: [{ code: "ADMIN", display: "Policy Holder Admin" }], text: "Policy Holder Admin" }],
          contact: [
            {
              name: [{ text: "Kuna Johilk", family: "Johilk", given: ["Kuna"] }],
              telecom: [{ system: "email", value: "kuna@example.org" }],
            },
          ],
        },
      ])
    );
    const [staff] = (await new FormalSectorDevAPIClient(http.asHttpClient()).staffs.list()).data!.items;
    expect(staff).toMatchObject({
      uuid: "b48d36f6-73b1-48ab-849f-b58fefd67930",
      username: "JHOS0011",
      displayName: "Kuna Johilk",
      role: "ADMIN",
      email: "kuna@example.org",
      active: true,
    });
  });
});

describe("per-employee filters", () => {
  it("sends _chfid for contracts and payments", async () => {
    const http = new MockHttpClient();
    http
      .on("GET", "/policy-holder-dev-api/contracts/", searchBundle("Contract", []))
      .on("GET", "/policy-holder-dev-api/payments/", searchBundle("PaymentReconciliation", []));
    const client = new FormalSectorDevAPIClient(http.asHttpClient());
    await client.contracts.list(new ContractListFilters(1, 10, undefined, undefined, "160000002"));
    expect(http.lastCall?.path).toContain("_chfid=160000002");
    await client.payments.list(new PaymentListFilters(1, 10, "160000002"));
    expect(http.lastCall?.path).toContain("_chfid=160000002");
  });
});

describe("employee claim converter", () => {
  // Captured from GET policy-holder-dev-api/employee-claims/ (administrative fields only).
  const realEmployeeClaim = {"resourceType": "Claim", "id": "ea186ace-d47d-48c8-847c-346a696aec72", "extension": [{"url": "http://openimis.org/fhir/StructureDefinition/claim-approved-amount", "valueMoney": {"value": 104.76, "currency": "₦"}}, {"url": "http://openimis.org/fhir/StructureDefinition/claim-valuated-amount", "valueMoney": {"value": 104.76, "currency": "₦"}}, {"url": "http://openimis.org/fhir/StructureDefinition/claim-date-processed", "valueDate": "2026-07-29"}], "identifier": [{"type": {"coding": [{"system": "https://openimis.github.io/openimis_fhir_r4_ig/CodeSystem/openimis-identifiers", "code": "UUID"}]}, "system": "https://openimis.github.io/openimis_fhir_r4_ig/CodeSystem/openimis-identifiers/UUID", "value": "ea186ace-d47d-48c8-847c-346a696aec72"}, {"type": {"coding": [{"system": "https://openimis.github.io/openimis_fhir_r4_ig/CodeSystem/openimis-identifiers", "code": "MR"}]}, "system": "https://openimis.github.io/openimis_fhir_r4_ig/CodeSystem/openimis-identifiers/MR", "value": "CLM-92393068"}], "status": "VALUATED", "type": {"coding": [{"system": "http://localhost:8000/CodeSystem/claim-visit-type", "code": "R", "display": "Referrals"}]}, "use": "claim", "patient": {"reference": "Patient/070707055", "type": "Patient", "identifier": {"system": "http://example.org/facility-ids", "value": "070707055"}, "display": "Kujabi/Dawda Borje"}, "billablePeriod": {"start": "2026-07-27", "end": "2026-07-28"}, "created": "2026-07-28", "provider": {"reference": "Organization/1ebc4a36-d143-45eb-ab93-d7e973d8f14b", "type": "Organization", "identifier": {"system": "http://example.org/facility-ids", "value": "1ebc4a36-d143-45eb-ab93-d7e973d8f14b"}, "display": "Rajo District Hospital"}, "total": {"value": 162.83, "currency": "₦"}};

  it("parses the backend's employee claim and its financial extensions", async () => {
    const http = new MockHttpClient();
    http.on("GET", "/policy-holder-dev-api/employee-claims/", searchBundle("Claim", [realEmployeeClaim]));
    const resp = await new FormalSectorDevAPIClient(http.asHttpClient()).employeeClaims.list(
      new EmployeeClaimListFilters(1, 10, "e873cf2d-fc56-432c-a52d-d0bdb2f35dc1")
    );
    expect(resp.data?.items[0]).toMatchObject({
      code: "CLM-92393068",
      status: "VALUATED",
      patientChfId: "070707055",
      dateFrom: "2026-07-27",
      total: 162.83,
      currency: "₦",
      approvedAmount: 104.76,
      dateProcessed: "2026-07-29",
      items: [],
      diagnoses: [],
    });
  });
});

describe("family group converter", () => {
  it("reads which member heads the household", async () => {
    const member = (chf: string, display: string, head: boolean) => ({
      entity: {
        reference: `Patient/${chf}`,
        display,
        identifier: { value: chf },
        extension: [
          { url: "http://openimis.org/fhir/StructureDefinition/insuree-uuid", valueString: `${chf}-uuid` },
          { url: "http://openimis.org/fhir/StructureDefinition/patient-is-head", valueBoolean: head },
        ],
      },
    });
    const http = new MockHttpClient();
    http.on("GET", "/policy-holder-dev-api/groups/", {
      resourceType: "Group",
      type: "organization",
      membership: "definitional",
      member: [member("160000001", "Xiao Shan", true), member("160000002", "Xum Shan", false)],
    });
    const resp = await new FormalSectorDevAPIClient(http.asHttpClient()).groups.getByEmployeeUuid("x");
    expect(resp.data?.members.map((m) => [m.display, m.isHead])).toEqual([
      ["Xiao Shan", true],
      ["Xum Shan", false],
    ]);
  });
});

describe("status vocabularies", () => {
  it.each([
    ["paid", "paid"],
    ["5", "paid"],
    ["payment_matched", "paid"],
    ["failed", "failed"],
    ["-2", "failed"],
    ["rejected_posted_1", "failed"],
    ["pending", "pending"],
    ["unknown", "pending"],
    [null, "pending"],
  ])("payment %s → %s", (raw, expected) => {
    expect(classifyPaymentStatus(raw)).toBe(expected);
  });

  it("normalises contract states and groups them like the analytics funnel", () => {
    expect(normalizeContractState("request_for_information")).toBe("request-for-information");
    expect(normalizeContractState(7)).toBe("effective");
    expect(contractStateGroup("counter")).toBe("offer_negotiation");
    expect(isContractEditable("draft")).toBe(true);
    expect(isContractEditable("effective")).toBe(false);
    expect(groupContractStateCounts({ draft: 2, request_for_information: 1, terminated: 1 })).toMatchObject({
      draft_like: 3,
      closed: 1,
    });
  });

  it("picks the amount for the contract state like backend Contract.amount", () => {
    const c = new ContractModel("1", "C1", "draft");
    c.amountNotified = 10;
    c.amountRectified = 20;
    c.amountDue = 30;
    expect(c.amount).toBe(10);
    c.status = "negotiable";
    expect(c.amount).toBe(20);
    c.status = "effective";
    expect(c.amount).toBe(30);
  });

  it("reads validity, contract-level amount due and currency from backend output", async () => {
    const http = new MockHttpClient();
    const term = {
      topicReference: { reference: "InsurancePlan/3", display: "SEAD" },
      asset: [{ valuedItem: [{ net: { value: 65000, currency: "$" } }] }],
    };
    http.on(
      "GET",
      "/policy-holder-dev-api/contracts/",
      searchBundle("Contract", [
        {
          resourceType: "Contract",
          id: "c1",
          identifier: [
            { system: "http://openimis.org/contract-uuid", value: "c1" },
            { system: "http://openimis.org/contract-code", value: "234342344455" },
          ],
          status: "executable",
          applies: { start: "2026-08-06T00:00:00+00:00", end: "2027-08-06T00:00:00+00:00" },
          // Backend repeats amount_due on every member term.
          term: [term, term],
          extension: [
            { url: "http://openimis.org/fhir/StructureDefinition/amountNotified", valueDecimal: 65000 },
            { url: "http://openimis.org/fhir/StructureDefinition/amountDue", valueMoney: { value: 65000, currency: "$" } },
            { url: "http://openimis.org/fhir/StructureDefinition/paymentDueDate", valueDateTime: "2026-09-01" },
          ],
        },
      ])
    );
    const [c] = (await new FormalSectorDevAPIClient(http.asHttpClient()).contracts.list()).data!.items;
    expect(c).toMatchObject({
      code: "234342344455",
      dateValidFrom: "2026-08-06T00:00:00+00:00",
      dateValidTo: "2027-08-06T00:00:00+00:00",
      paymentDue: "2026-09-01",
      amountDue: 65000,
      currency: "$",
    });
    expect(c.amount).toBe(65000);
    expect(c.insurancePlans.map((t) => t.insurancePlanName)).toEqual(["SEAD"]);
  });

  it("recognises open enrollment states", () => {
    expect(["DRAFT", "pending", "IN_REVIEW"].every(isOpenEnrollmentStatus)).toBe(true);
    expect(isOpenEnrollmentStatus("APPROVED")).toBe(false);
  });
});

describe("validation mirrors the backend", () => {
  it("allows contracts ending on their start date (to >= from)", () => {
    expect(validateContractDraft({ code: "C", dateValidFrom: "2026-01-01", dateValidTo: "2026-01-01" })).toEqual([]);
    expect(
      validateContractDraft({ code: "C", dateValidFrom: "2026-02-01", dateValidTo: "2026-01-01" })[0]?.field
    ).toBe("dateValidTo");
  });

  it("does not offer legacy .xls uploads", () => {
    expect(employeeUploadContentType("members.xlsx")).toContain("spreadsheetml");
    expect(employeeUploadContentType("members.xls")).toBeUndefined();
  });

  it("applies policyholder validate_payload rules", () => {
    const fields = (data: Parameters<typeof validatePolicyHolderRegistration>[0]) =>
      validatePolicyHolderRegistration(data).map((e) => e.field);
    expect(fields({ policyholder_code: "AB", policyholder_name: "X" })).toEqual(["policyholder_code"]);
    expect(
      fields({ policyholder_code: "ACME1", policyholder_name: "Acme", policyholder_type: "CORPORATE" })
    ).toEqual(["registration_number"]);
    expect(
      fields({ policyholder_code: "ACME1", policyholder_name: "Acme", expected_members: 0 })
    ).toEqual(["expected_members"]);
  });
});

describe("formal-sector workflows", () => {
  function createClient() {
    const http = new MockHttpClient();
    return { http, client: new FormalSectorDevAPIClient(http.asHttpClient()) };
  }

  it("refuses to enrol on a package the employer does not offer", async () => {
    const { http, client } = createClient();
    http.on("GET", "/policy-holder-dev-api/insurance-plans/", searchBundle("InsurancePlan", [sampleInsurancePlanFhir()]));
    const resp = await client.enrollEmployee({ chfId: "CHF1", policyHolderContributionPlanId: "999" });
    expect(resp.success).toBe(false);
    expect(http.calls.some((c) => c.method === "POST")).toBe(false);
  });

  it("enrols with only the extensions the backend accepts", async () => {
    const { http, client } = createClient();
    http
      .on("GET", "/policy-holder-dev-api/insurance-plans/", searchBundle("InsurancePlan", [sampleInsurancePlanFhir()]))
      .on("POST", "/policy-holder-dev-api/employees/", sampleEmployeeFhir());
    const packages = await client.insurancePlans.listEnrollablePackages();
    const planId = packages.data![0].policyHolderContributionPlanId!;

    const resp = await client.enrollEmployee({ chfId: "CHF1", policyHolderContributionPlanId: planId });
    expect(resp.success).toBe(true);
    const body = http.lastCall?.body as fhir4.Patient;
    expect(body.identifier?.[0]?.value).toBe("CHF1");
    expect(body.extension?.map((e) => e.url.split("/").pop())).toEqual([
      "employee-income",
      "PolicyHolderContributionPlanID",
    ]);
    expect(body.extension?.[0]?.valueDecimal).toBe(0);
  });

  it("updates package and income with a portal JSON PATCH", async () => {
    const { http, client } = createClient();
    http.on("PATCH", "/policy-holder-dev-api/employees/abc/", sampleEmployeeFhir());
    const resp = await client.employees.update("abc", { policyHolderContributionPlanId: " 7 ", income: 5000 });
    expect(resp.success).toBe(true);
    expect(http.lastCall?.body).toEqual({ policy_holder_contribution_plan_id: "7", income: 5000 });
    const invalid = await client.employees.update("abc", { income: -1 });
    expect(invalid.success).toBe(false);
    expect(http.calls).toHaveLength(1);
  });

  it("returns the insuree photo with the employee profile", async () => {
    const { http, client } = createClient();
    http
      .on("GET", "/policy-holder-dev-api/employees/33333333", sampleEmployeeFhir())
      .on(
        "GET",
        "/policy-holder-dev-api/patients/CHF999/",
        samplePatientFhir({
          photo: [{ contentType: "image/jpeg", data: "/9j/4AAQSkZJRg==", title: "db0f5418", creation: "2026-08-03" }],
        })
      );
    const resp = await client.getEmployeeProfile("33333333-3333-4333-8333-333333333333");
    const insuree = resp.data!.insuree!;
    expect(resolvePatientPhotoSrc(insuree, "http://localhost:8000/api")).toBe(
      "data:image/jpeg;base64,/9j/4AAQSkZJRg=="
    );
  });

  it("reads profile demographics from the employer-scoped patients endpoint", async () => {
    const { http, client } = createClient();
    http
      .on("GET", "/policy-holder-dev-api/employees/33333333", sampleEmployeeFhir())
      .on("GET", "/policy-holder-dev-api/patients/CHF999/", samplePatientFhir());
    const resp = await client.getEmployeeProfile("33333333-3333-4333-8333-333333333333");
    expect(resp.success).toBe(true);
    expect(resp.data?.insuree).not.toBeNull();
    expect(http.calls.some((c) => c.path.includes("search-employee"))).toBe(false);
  });

  it("validates contract drafts before posting", async () => {
    const { http, client } = createClient();
    const resp = await client.contracts.createDraft({ code: "", dateValidFrom: "x", dateValidTo: "" });
    expect(resp.success).toBe(false);
    expect(resp.errorDetails.length).toBeGreaterThan(0);
    expect(http.calls).toHaveLength(0);
  });
});

describe("enrollment workflows", () => {
  it("submits an existing draft instead of creating a duplicate code", async () => {
    const http = new MockHttpClient();
    const client = new EnrollmentDevAPIClient(http.asHttpClient()).policyHolder;
    http
      .on("GET", "/enrollment/policy-holder-registration/account-claim/", { results: [] })
      .on("GET", "/enrollment/policy-holder-registration/", {
        count: 1,
        results: [{ uuid: "draft-1", status: "DRAFT", policyholder_data: { policyholder_code: "acme1" } }],
      })
      .on("POST", "/enrollment/policy-holder-registration/draft-1/submit/", { success: true, message: "ok" });

    const resp = await client.registerAndSubmit({ policyholder_code: "ACME1", policyholder_name: "Acme" });
    expect(resp.success).toBe(true);
    expect(http.calls.filter((c) => c.method === "POST").map((c) => c.path)).toEqual([
      "/enrollment/policy-holder-registration/draft-1/submit/",
    ]);
  });
});

describe("dashboard summaries", () => {
  it("maps backend policy-holder payloads into typed views", async () => {
    const http = new MockHttpClient();
    http
      .on("GET", "/dashboard/metric/policy-holder/", {
        filter_applied: { months: 6, granularity: "month", expiring_days: 60 },
        employees: { total_active: 10, with_policy: 8, without_policy: 2, coverage_percentage: 80, period_new: 3, growth_rate: null },
        contracts: { total: 4, active: 2, draft: 1, expiring_soon: 1, by_state: { draft: 1, effective: 2 }, period_created: 1 },
        insurance_plans: { total_active: 2, subscribed: 1, coverage_rate: 50, by_plan: [{ plan_id: "p1", name: "Basic", code: "B", enrollee_count: 7 }] },
        contributions: { premium_count: 5, total_amount: 1000, period_breakdown: [{ period: "2026-01", premium_count: 5, total_amount: 1000 }] },
        payments: { total: 3, total_received: 900, expected_amount: 1000, pending_amount: 100, by_status: { payment_matched: 2 } },
        claims_summary: { total: 12, approved: 7, amount_metrics: { total_claimed: 500, total_approved: 400 }, period_breakdown: [{ period: "2026-01", total: 12 }] },
      })
      .on("GET", "/dashboard/analytics/policy-holder/", {
        filter_applied: { months: 6 },
        comparisons: { current: { employees_new: 3, rejection_rate: 0.1 }, previous: { employees_new: 2 }, delta_pct: { employees_new: 50, claims_total: null } },
        series: [{ period: "2026-01", value: 12, rejected: 1, rejection_rate: 0.08, total_claimed: 500, total_approved: 400, approval_ratio: 0.8 }],
        insights: [],
        payment_gap: { premium_amount: 1000, received_amount: 900, gap_amount: 100, collection_rate: 0.9 },
        enrollment_velocity: { active_employees: 10, series: [{ period: "2026-01", new: 3, churned: 1, net: 2 }] },
        contract_funnel: { stages: [{ stage: "draft_like", count: 1 }] },
        cost_drivers: { by_health_facility: [{ health_facility_id: 1, health_facility_name: "HF", total: 2, total_claimed: 500, total_approved: 400 }], by_visit_type: [] },
      });

    const overview = await new DashboardDevAPIClient(http.asHttpClient()).policyHolderOverview({ months: "1" });
    expect(http.calls[0].path).toContain("months=2");
    expect(overview.metrics.data?.employees.growthRate).toBeNull();
    expect(overview.metrics.data?.insurancePlans.byPlan[0]).toMatchObject({ planId: "p1", enrolleeCount: 7 });
    expect(overview.metrics.data?.claims.totalApproved).toBe(400);
    expect(overview.analytics.data?.deltaPct).toEqual({ employeesNew: 50, claimsTotal: null });
    expect(overview.analytics.data?.enrollment.series[0]?.churned).toBe(1);
    expect(overview.analytics.data?.contractFunnel[0]).toEqual({ stage: "draft_like", count: 1 });
  });

  it("clamps dashboard query input", () => {
    expect(normalizeDashboardQuery({ months: "0", granularity: "year" })).toEqual({ months: 2, granularity: "month" });
    expect(normalizeDashboardQuery({ months: 99, granularity: "week" })).toEqual({ months: 24, granularity: "week" });
  });
});

describe("utilities", () => {
  it("collects every page and stops at the last one", async () => {
    const pages = [
      new FhirSearchPage(3, [1, 2], undefined, "next"),
      new FhirSearchPage(3, [3]),
    ];
    const resp = await collectAllPages((page) => Promise.resolve(ApiResponse.ok(pages[page - 1])), { pageSize: 2 });
    expect(resp.data).toEqual({ items: [1, 2, 3], total: 3, truncated: false });
  });

  it("writes CSV with formula-injection guard", () => {
    expect(toCsv(["v"], [["=1+1"], ['a"b']])).toBe("v\r\n'=1+1\r\n\"a\"\"b\"\r\n");
  });

  it("describes upload errors without doubling the row prefix", () => {
    expect(
      describeErrorDetails([{ row: 3, error: "Row 3: insuree 'X' is already linked" }, { field: "code", errors: ["taken"] }])
    ).toEqual(["Row 3: insuree 'X' is already linked", "code: taken"]);
  });
});
