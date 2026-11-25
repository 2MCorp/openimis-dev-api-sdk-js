import type {
  CalculationParam,
  CalculationRuleSetRef,
  CalculationValues,
} from "../../formalsector/calculation_inputs";
import type { SearchPageDto } from "../common/types";
import type { ContractStateGroup } from "../../formalsector/contract_states";
import type { PaymentStatus } from "../../formalsector/payment_status";
import type { DashboardGranularity } from "../../dashboard/types";
import type {
  PolicyHolderAnalyticsSummary,
  PolicyHolderMetricsSummary,
} from "../../dashboard/policy_holder_views";

/** Plain, JSON-serialisable shapes returned by the employer portal API routes. */

export type { SearchPageDto };

/** Employee record (`/employees/` — PolicyHolderInsuree as FHIR Patient). */
export type EmployeeDto = {
  /** PolicyHolderInsuree UUID — used for detail, groups and claims lookups. */
  id: string;
  chfId: string;
  lastName: string;
  otherNames: string;
  fullName: string;
  employeeId?: string;
  insureeUuid?: string;
  birthDate?: string;
  maritalStatus?: string;
  /** Calculation inputs stored on the employee (income, ...). */
  calculationRule: CalculationValues;
  /** Enrolled contribution plan bundle (backend sends `CODE/Name`). */
  planName?: string;
  planCode?: string;
  /** PolicyHolderContributionPlan id the employee is enrolled on. */
  planId?: string;
};

export type InsureeAddressDto = {
  text?: string;
  city?: string;
  district?: string;
  state?: string;
  municipality?: string;
};

/** Insuree demographics (`/search-employee/` — openIMIS Insuree as FHIR Patient). */
export type InsureeDto = {
  id: string;
  chfId: string;
  uuid?: string;
  lastName: string;
  otherNames: string;
  fullName: string;
  birthDate?: string;
  gender?: string;
  phone?: string;
  email?: string;
  /** Browser-ready image src (`data:` URI or absolute URL). */
  photoUrl?: string;
  isHead: boolean;
  cardIssued: boolean;
  maritalStatus?: string;
  professionDisplay?: string;
  educationDisplay?: string;
  address?: InsureeAddressDto | null;
};

export type FamilyMemberDto = {
  chfId: string;
  display?: string;
  insureeUuid?: string;
  isHead: boolean;
};

export type FamilyGroupDto = {
  id: string;
  uuid?: string;
  type: string;
  members: FamilyMemberDto[];
};

/** Inputs a package's calculation rule sets need from an employee. */
export type CalculationFormDto = {
  ruleSets: CalculationRuleSetRef[];
  parameters: CalculationParam[];
  /** Values stored on the employee (empty for a new employee). */
  values: CalculationValues;
};

export type EmployeeDetailDto = {
  employee: EmployeeDto;
  insuree: InsureeDto | null;
  calculation: CalculationFormDto | null;
};

export type ContractSubjectDto = { chfId: string; display?: string };

export type ContractTermDto = {
  insurancePlanId?: string;
  insurancePlanName?: string;
  amountDue?: number;
  currency?: string;
};

export type ContractDto = {
  id: string;
  code: string;
  /** Normalised contract state, e.g. `draft`, `effective`. */
  status?: string;
  stateGroup?: ContractStateGroup;
  editable: boolean;
  amountDue?: number;
  amount?: number;
  currency?: string;
  issued?: string;
  paymentDue?: string;
  dateValidFrom?: string;
  dateValidTo?: string;
  policyHolderName?: string;
  subjects: ContractSubjectDto[];
  terms: ContractTermDto[];
  amountNotified?: number;
  amountRectified?: number;
  paymentReference?: string;
  amendment?: string;
};

export type HealthPackagePlanDto = {
  detailId?: string;
  contributionPlanId?: string;
  code?: string;
  name?: string;
};

/** Policy-holder contribution plan (`/insurance-plans/`). */
export type HealthPackageDto = {
  id: string;
  name: string;
  /** Sent as `PolicyHolderContributionPlanID` when enrolling an employee. */
  policyHolderContributionPlanId?: string;
  bundleUuid?: string;
  bundleId?: string;
  bundleCode?: string;
  plans: HealthPackagePlanDto[];
};

export type PaymentStatusKey = PaymentStatus;

export type PaymentDetailDto = {
  id?: string;
  policyStage?: string;
  amount?: number;
  payeeInsuranceNumber?: string;
};

export type PaymentDto = {
  id: string;
  status?: string;
  /** paid / pending / failed. */
  statusKey: PaymentStatusKey;
  created?: string;
  paymentDate?: string;
  amount?: number;
  currency?: string;
  transactionNo?: string;
  receiptNo?: string;
  disposition?: string;
  contractCode?: string;
  details: PaymentDetailDto[];
};

export type ClaimLineDto = {
  sequence: number;
  code: string;
  category: "item" | "service" | string;
  quantity?: number;
  unitPrice?: number;
  currency?: string;
};

export type ClaimDto = {
  id: string;
  code: string;
  status: string;
  patientChfId: string;
  patientName?: string;
  created?: string;
  dateFrom?: string;
  dateTo?: string;
  total?: number;
  approvedAmount?: number;
  dateProcessed?: string;
  currency?: string;
  visitType?: string;
  diagnoses: { sequence: number; code: string; display?: string }[];
  items: ClaimLineDto[];
};

/** PH staff (`/staffs/` — FHIR OrganizationAffiliation). */
export type StaffDto = {
  id: string;
  uuid: string;
  active: boolean;
  username?: string;
  displayName: string;
  /** `ADMIN` or `STAFF`. */
  role?: string;
  email?: string;
  phone?: string;
};

export type BulkUploadResultDto = {
  created: number;
  employees: EmployeeDto[];
};

export type DashboardApiPayload = {
  metrics: PolicyHolderMetricsSummary | null;
  metricsError: string | null;
  /** Contracts per funnel stage. */
  contractGroups: Record<ContractStateGroup, number> | null;
  analytics: PolicyHolderAnalyticsSummary | null;
  analyticsError: string | null;
  query: { months: number; granularity: DashboardGranularity };
};

/** Enrollment page DTOs. */
export type EnrollmentPendingDto = {
  uuid: string;
  status: string;
  kind: string;
  summary: string;
  dateCreated?: string;
};
export type EnrollmentRegionDto = { id: number; code: string; name: string };
export type EnrollmentDistrictDto = EnrollmentRegionDto & { parentId: number | null };
