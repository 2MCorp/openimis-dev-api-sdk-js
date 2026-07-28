import { OPENIMIS_IDENTIFIER_SYSTEM } from "../../src/fhir_converter/constants";
import {
  EMPLOYEE_UUID_SYSTEM,
  INSUREE_NUMBER_SYSTEM,
  INSUREE_UUID_SYSTEM,
} from "../../src/fhir_converter/constants";

export function samplePatientFhir(overrides: Record<string, unknown> = {}) {
  return {
    resourceType: "Patient",
    id: "11111111-1111-4111-8111-111111111111",
    identifier: [
      {
        system: OPENIMIS_IDENTIFIER_SYSTEM,
        value: "11111111-1111-4111-8111-111111111111",
      },
      {
        system: OPENIMIS_IDENTIFIER_SYSTEM,
        value: "CHF123456",
      },
    ],
    name: [
      {
        use: "usual",
        family: "Doe",
        given: ["John"],
      },
    ],
    birthDate: "1990-01-15",
    gender: "male",
    ...overrides,
  };
}

export function sampleClaimFhir(overrides: Record<string, unknown> = {}) {
  return {
    resourceType: "Claim",
    id: "22222222-2222-4222-8222-222222222222",
    status: "ENTERED",
    use: "claim",
    created: "2024-01-15",
    identifier: [
      {
        system: OPENIMIS_IDENTIFIER_SYSTEM,
        value: "22222222-2222-4222-8222-222222222222",
      },
      {
        system: OPENIMIS_IDENTIFIER_SYSTEM,
        value: "CLM-001",
      },
    ],
    patient: {
      reference: "Patient/CHF123456",
      display: "CHF123456",
    },
    provider: {
      reference: "Organization/HF001",
    },
    type: {
      coding: [{ code: "O", display: "Other" }],
    },
    priority: {
      coding: [{ code: "normal" }],
    },
    insurance: [
      {
        sequence: 1,
        focal: true,
        coverage: { reference: "Coverage/1" },
      },
    ],
    total: { value: 100, currency: "$" },
    ...overrides,
  };
}

export function sampleEmployeeFhir(overrides: Record<string, unknown> = {}) {
  return {
    resourceType: "Patient",
    id: "33333333-3333-4333-8333-333333333333",
    identifier: [
      {
        system: "http://example.com/fhir/identifier",
        value: "42",
        type: { coding: [{ code: "MR" }] },
      },
      {
        system: EMPLOYEE_UUID_SYSTEM,
        value: "33333333-3333-4333-8333-333333333333",
        type: { coding: [{ code: "EMP" }] },
      },
      {
        system: INSUREE_UUID_SYSTEM,
        value: "44444444-4444-4444-8444-444444444444",
        type: { coding: [{ code: "INS" }] },
      },
      {
        system: INSUREE_NUMBER_SYSTEM,
        value: "CHF999",
        type: { coding: [{ code: "INSNUM" }] },
      },
    ],
    name: [
      {
        use: "official",
        family: "Smith",
        given: ["Jane"],
      },
    ],
    birthDate: "1988-05-01",
    ...overrides,
  };
}

export function sampleLocationFhir(overrides: Record<string, unknown> = {}) {
  return {
    resourceType: "Location",
    id: "hf-1",
    status: "active",
    name: "Demo Health Center",
    identifier: [
      {
        system: OPENIMIS_IDENTIFIER_SYSTEM,
        value: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      },
      {
        system: OPENIMIS_IDENTIFIER_SYSTEM,
        value: "VIHC001",
        type: { coding: [{ code: "HF" }] },
      },
    ],
    type: [
      {
        coding: [
          {
            code: "C",
            display: "health-center",
          },
        ],
      },
    ],
    ...overrides,
  };
}

export function sampleMedicationFhir(overrides: Record<string, unknown> = {}) {
  return {
    resourceType: "Medication",
    id: "med-1",
    status: "active",
    identifier: [
      {
        system: OPENIMIS_IDENTIFIER_SYSTEM,
        value: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      },
      {
        system: OPENIMIS_IDENTIFIER_SYSTEM,
        value: "PARA500",
      },
    ],
    code: { text: "Paracetamol 500mg" },
    form: { text: "tablet" },
    ...overrides,
  };
}

export function samplePreauthFhir(overrides: Record<string, unknown> = {}) {
  return {
    ...sampleClaimFhir({
      id: "preauth-1",
      use: "preauthorization",
      status: "Entered",
      identifier: [
        {
          system: "http://openimis.org/identifiers/preauthorization",
          value: "preauth-uuid-1",
        },
      ],
      ...overrides,
    }),
  };
}

export function sampleContractFhir(overrides: Record<string, unknown> = {}) {
  return {
    resourceType: "Contract",
    id: "contract-1",
    status: "executed",
    identifier: [
      {
        system: "http://openimis.org/contract-uuid",
        value: "contract-1",
      },
      {
        system: "http://openimis.org/contract-code",
        value: "CTR-001",
      },
    ],
    subject: [{ reference: "Patient/CHF999", display: "Jane Smith" }],
    ...overrides,
  };
}

export function sampleInsurancePlanFhir(
  overrides: Record<string, unknown> = {}
) {
  return {
    resourceType: "InsurancePlan",
    id: "15",
    name: "Formal Sector Plan",
    identifier: [
      { system: "http://example.com/fhir/PHCPID", value: "15" },
      {
        system: "http://example.com/fhir/CPBUUID",
        value: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      },
      { system: "http://example.com/fhir/CPBCODE", value: "FS-BASIC" },
    ],
    plan: [
      {
        identifier: [
          { system: "http://example.com/fhir/CPBDID", value: "1" },
          { system: "http://example.com/fhir/CPCODE", value: "CP01" },
        ],
        type: { coding: [{ code: "CP01", display: "Basic CP" }] },
      },
    ],
    ...overrides,
  };
}

export function sampleStaffFhir(overrides: Record<string, unknown> = {}) {
  return {
    resourceType: "OrganizationAffiliation",
    id: "staff-uuid-1",
    active: true,
    identifier: [
      { system: "urn:ietf:rfc:3986", value: "staff-uuid-1" },
      {
        system: "https://example.org/policyholderusers",
        value: "7",
      },
    ],
    organization: { reference: "Organization/policy-holder" },
    participatingOrganization: {
      reference: "Organization/policy-holder",
    },
    ...overrides,
  };
}

export function samplePaymentReconciliationFhir(
  overrides: Record<string, unknown> = {}
) {
  return {
    resourceType: "PaymentReconciliation",
    id: "pay-1",
    status: "active",
    created: "2024-02-01T00:00:00Z",
    paymentDate: "2024-02-01",
    paymentAmount: { value: 250, currency: "USD" },
    ...overrides,
  };
}

export function sampleGroupFhir(overrides: Record<string, unknown> = {}) {
  return {
    resourceType: "Group",
    id: "group-1",
    type: "person",
    actual: false,
    identifier: [
      {
        system: "http://example.com/fhir/employee-group-id",
        value: "group-1",
        type: { coding: [{ code: "employee-group-id" }] },
      },
    ],
    member: [
      {
        entity: {
          reference: "CHF999",
          display: "Jane Smith",
        },
      },
    ],
    ...overrides,
  };
}

export function sampleChargeItemFhir(overrides: Record<string, unknown> = {}) {
  return {
    resourceType: "ChargeItem",
    id: "ci-1",
    status: "active",
    code: {
      text: "ITEM001",
      coding: [{ code: "ITEM001", display: "Item 001" }],
    },
    subject: { reference: "Patient/CHF123456" },
    quantity: { value: 2 },
    priceOverride: { value: 10.5, currency: "$" },
    identifier: [
      {
        system: "Identifier/claim-id",
        value: "22222222-2222-4222-8222-222222222222",
      },
    ],
    ...overrides,
  };
}

export function samplePolicyHolderMetric() {
  return {
    filter_applied: {
      date_from: "2024-01-01",
      date_to: "2024-06-30",
      months: 6,
      granularity: "month",
      expiring_days: 60,
    },
    employees: {
      total_active: 10,
      with_policy: 8,
      without_policy: 2,
      coverage_percentage: 80,
      period_new: 3,
      growth_rate: 50,
    },
    contracts: { total: 4, active: 2, draft: 1, expiring_soon: 1 },
    insurance_plans: { total_active: 2, subscribed: 2, coverage_rate: 1 },
    contributions: { premium_count: 5, total_amount: 1000 },
    payments: { total: 3, total_received: 900, expected_amount: 1000 },
    claims_summary: {
      total: 12,
      rejected: 1,
      entered: 4,
      checked: 3,
      valuated: 4,
      approved: 7,
      unique_patients: 9,
    },
  };
}

export function sampleHealthFacilityMetric() {
  return {
    filter_applied: {
      date_from: "2024-01-01",
      date_to: "2024-06-30",
      months: 6,
      granularity: "month",
      recent_limit: 5,
    },
    claims: { total: 20, entered: 5 },
    encounters: { total: 8, entered: 2 },
    preauthorizations: { total: 3, entered: 1 },
    time_series: [{ period: "2024-01", claims: 4 }],
    processing_analytics: { avg_hours: 12 },
    lifetime_totals: { claims: 100, encounters: 40, preauthorizations: 10 },
    open_queues: {
      claims_entered: 5,
      encounters_entered: 2,
      preauths_entered: 1,
      preauths_pending: 0,
    },
    today: { claims: 1, encounters: 0, preauthorizations: 0 },
    claims_value_mtd: {
      count: 2,
      total_claimed: 200,
      total_approved: 150,
      month_start: "2024-06-01",
      as_of: "2024-06-15",
    },
    recent: { claims: [], encounters: [], preauthorizations: [] },
  };
}

export function sampleSystemMetric() {
  return {
    api_keys: {
      system: { total: 1, active: 1, revoked: 0, expired: 0 },
      policy_holder: { total: 2, active: 2, revoked: 0, expired: 0 },
      health_facility: { total: 3, active: 2, revoked: 1, expired: 0 },
      insuree: { total: 0, active: 0, revoked: 0, expired: 0 },
    },
    insuree_users: {
      total: 5,
      verified: 4,
      by_status: {
        active: 4,
        inactive: 1,
        suspended: 0,
        in_enrollment: 0,
      },
    },
    plugins: { configured: 8, enabled: 7, installed: 7, items: [] },
    data_imports: {
      total: 10,
      by_status: {
        pending: 1,
        processing: 0,
        completed: 8,
        failed: 1,
      },
    },
    event_bus: { health_facility_kafka_topics: 2 },
  };
}

export function samplePolicyHolderAnalytics() {
  return {
    filter_applied: {
      date_from: "2024-01-01",
      date_to: "2024-06-30",
      prior_date_from: "2023-07-01",
      prior_date_to: "2023-12-31",
      months: 6,
      granularity: "month",
    },
    comparisons: {
      current: { employees: 10 },
      previous: { employees: 8 },
      delta_pct: { employees: 25 },
    },
    series: [{ period: "2024-01", employees: 2 }],
    insights: [
      {
        type: "warning",
        code: "payment_gap",
        message: "Collection rate dropped",
        meta: { rate: 0.7 },
      },
    ],
    payment_gap: { collection_rate: 0.7 },
    enrollment_velocity: { net: 2 },
    contract_funnel: { draft: 1, effective: 2 },
    cost_drivers: { top_facilities: [] },
  };
}

export function sampleHealthFacilityAnalytics() {
  return {
    filter_applied: {
      date_from: "2024-01-01",
      date_to: "2024-06-30",
      months: 6,
      granularity: "month",
      sla_hours: 48,
    },
    comparisons: {
      current: { claims: 20 },
      previous: { claims: 15 },
      delta_pct: { claims: 33.3 },
    },
    series: [{ period: "2024-01", claims: 4 }],
    insights: [
      {
        type: "info",
        code: "volume_up",
        message: "Claim volume increased",
      },
    ],
    rates: { approval_rate: 0.8 },
    sla: { within_sla_pct: 0.9 },
    amount_leakage: { claimed_vs_approved: 50 },
    referrals: { outbound: 2 },
    seasonality: { peak_month: "2024-03" },
  };
}

export function sampleSystemAnalytics() {
  return {
    filter_applied: {
      date_from: "2024-01-01",
      date_to: "2024-06-30",
      months: 6,
      granularity: "month",
    },
    comparisons: {
      current: { api_keys: 6 },
      previous: { api_keys: 4 },
      delta_pct: { api_keys: 50 },
    },
    series: [{ period: "2024-01", api_keys: 1 }],
    insights: [],
    api_key_lifecycle: { created: 2, revoked: 1 },
    plugin_health: { enabled: 7 },
    import_health: { failed: 1 },
    insuree_adoption: { verified: 4 },
  };
}

export function sampleCodeSystemFhir(overrides: Record<string, unknown> = {}) {
  return {
    resourceType: "CodeSystem",
    id: "icd-1",
    status: "active",
    content: "complete",
    name: "A00 - Cholera",
    title: "A00 - Cholera",
    concept: [
      {
        code: "A00",
        display: "Cholera",
        definition: "Cholera",
      },
    ],
    ...overrides,
  };
}

export function sampleChargeItemDefinitionFhir(
  overrides: Record<string, unknown> = {}
) {
  return {
    resourceType: "ChargeItemDefinition",
    id: "svc-1",
    status: "active",
    title: "Consultation",
    code: {
      text: "Consultation",
      coding: [{ code: "CONS01", display: "Consultation" }],
    },
    identifier: [
      {
        system: "http://openimis.org/identifiers/service",
        value: "CONS01",
      },
    ],
    useContext: [
      {
        code: { code: "program" },
        valueCodeableConcept: {
          coding: [{ code: "C" }],
        },
      },
    ],
    ...overrides,
  };
}

export function sampleDocumentReferenceFhir(
  overrides: Record<string, unknown> = {}
) {
  return {
    resourceType: "DocumentReference",
    id: "att-1",
    status: "current",
    type: { text: "FILE" },
    content: [
      {
        attachment: {
          title: "lab-report.pdf",
          contentType: "application/pdf",
          data: "YmFzZTY0",
          creation: "2024-01-15",
        },
      },
    ],
    ...overrides,
  };
}
