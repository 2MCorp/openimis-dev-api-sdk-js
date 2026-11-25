import type { ClaimModel } from "../../models/claim";
import type { ContractModel } from "../../models/contract";
import type { EmployeeModel } from "../../models/employee";
import type { EmployeeGroupModel } from "../../models/group";
import type { EmployeeInsurancePlanModel } from "../../models/insurance_plan";
import type { PatientModel } from "../../models/patient";
import type { PaymentReconciliationModel } from "../../models/payment";
import type { StaffModel } from "../../models/staff";
import type { FhirSearchPage } from "../../models/pagination";
import type { EmployeeCalculationForm } from "../../formalsector/calculation_inputs";
import { resolvePatientPhotoSrc } from "../../utils/photo";
import type {
  CalculationFormDto,
  ClaimDto,
  ContractDto,
  EmployeeDto,
  FamilyGroupDto,
  HealthPackageDto,
  InsureeDto,
  PaymentDto,
  SearchPageDto,
  StaffDto,
} from "./dto";

function clean(value: string | undefined | null): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export function serializeEmployee(e: EmployeeModel): EmployeeDto {
  return {
    id: e.id || e.employeeUuid || e.chfId,
    chfId: e.chfId,
    lastName: e.lastName,
    otherNames: e.otherNames,
    fullName: `${e.otherNames} ${e.lastName}`.trim() || e.chfId,
    employeeId: clean(e.employeeId),
    insureeUuid: clean(e.insureeUuid),
    birthDate: clean(e.birthDate),
    maritalStatus: clean(e.maritalStatus),
    calculationRule: { ...(e.calculationRule ?? {}) },
    planName: e.contributionPlanBundleName,
    planCode: e.contributionPlanBundleCode,
    planId: clean(e.contributionPlanBundleId),
  };
}

/** `apiBaseUrl` (the public developer-API root) resolves relative photo URLs. */
export function serializeInsuree(p: PatientModel, apiBaseUrl: string): InsureeDto {
  const hasAddress = !!(p.currentAddress || p.city || p.district || p.state || p.municipality);
  return {
    id: p.id,
    chfId: p.chfId,
    uuid: p.uuid,
    lastName: p.lastName,
    otherNames: p.otherNames,
    fullName: p.fullName || `${p.otherNames} ${p.lastName}`.trim(),
    birthDate: p.birthDate,
    gender: p.gender,
    phone: p.phone,
    email: p.email,
    photoUrl: resolvePatientPhotoSrc(p, apiBaseUrl),
    isHead: !!p.isHead,
    cardIssued: !!p.cardIssued,
    maritalStatus: p.maritalStatus,
    professionDisplay: p.professionDisplay,
    educationDisplay: p.educationDisplay,
    address: hasAddress
      ? {
          text: p.currentAddress,
          city: p.city,
          district: p.district,
          state: p.state,
          municipality: p.municipality,
        }
      : null,
  };
}

export function serializeFamilyGroup(g: EmployeeGroupModel): FamilyGroupDto {
  return {
    id: g.id,
    uuid: g.uuid,
    type: g.type,
    members: g.members.map((member) => ({
      chfId: member.chfId,
      display: clean(member.display),
      insureeUuid: clean(member.insureeUuid),
      isHead: member.isHead === true,
    })),
  };
}

export function serializeContract(c: ContractModel): ContractDto {
  return {
    id: c.id || c.code,
    code: c.code,
    status: c.state ?? clean(c.status),
    stateGroup: c.stateGroup,
    editable: c.editable,
    amountDue: c.amountDue,
    amount: c.amount,
    currency: clean(c.currency),
    issued: clean(c.issued),
    paymentDue: clean(c.paymentDue),
    dateValidFrom: clean(c.dateValidFrom),
    dateValidTo: clean(c.dateValidTo),
    policyHolderName: clean(c.policyHolderName),
    subjects: c.subjects.map((s) => ({ chfId: s.chfId, display: clean(s.display) })),
    terms: c.insurancePlans.map((t) => ({
      insurancePlanId: clean(t.insurancePlanId),
      insurancePlanName: clean(t.insurancePlanName),
      amountDue: t.amountDue,
      currency: clean(t.currency),
    })),
    amountNotified: c.amountNotified,
    amountRectified: c.amountRectified,
    paymentReference: clean(c.paymentReference),
    amendment: clean(c.amendment),
  };
}

export function serializeHealthPackage(p: EmployeeInsurancePlanModel): HealthPackageDto {
  return {
    id: p.id || p.policyHolderContributionPlanId || p.contributionPlanBundleUuid || p.name,
    name: p.name,
    policyHolderContributionPlanId: clean(p.policyHolderContributionPlanId),
    bundleUuid: clean(p.contributionPlanBundleUuid),
    bundleId: clean(p.contributionPlanBundleId),
    bundleCode: clean(p.contributionPlanBundleCode),
    plans: p.plans.map((plan) => ({
      detailId: clean(plan.detailId),
      contributionPlanId: clean(plan.contributionPlanId),
      code: clean(plan.code),
      name: clean(plan.name),
    })),
  };
}

export function serializePayment(p: PaymentReconciliationModel): PaymentDto {
  return {
    id: p.id,
    status: clean(p.status),
    statusKey: p.statusKey,
    created: clean(p.created),
    paymentDate: clean(p.paymentDate),
    amount: p.amount,
    currency: clean(p.currency),
    transactionNo: clean(p.transactionNo),
    receiptNo: clean(p.receiptNo),
    disposition: clean(p.disposition),
    contractCode: clean(p.contractCode),
    details: p.details.map((d) => ({
      id: clean(d.id),
      policyStage: clean(d.policyStage),
      amount: d.amount,
      payeeInsuranceNumber: clean(d.payeeInsuranceNumber),
    })),
  };
}

export function serializeClaim(c: ClaimModel): ClaimDto {
  return {
    id: c.uuid?.trim() || c.id,
    code: c.code,
    status: String(c.status),
    patientChfId: c.patientChfId,
    patientName: c.patientName,
    created: c.created,
    dateFrom: c.dateFrom,
    dateTo: c.dateTo,
    total: c.total,
    approvedAmount: c.approvedAmount,
    dateProcessed: c.dateProcessed,
    currency: c.currency,
    visitType: c.visitType != null ? String(c.visitType) : undefined,
    diagnoses: (c.diagnoses ?? []).map((d) => ({
      sequence: d.sequence,
      code: d.code,
      display: d.display,
    })),
    items: (c.items ?? []).map((item) => ({
      sequence: item.sequence,
      code: item.code,
      category: item.category,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      currency: item.currency,
    })),
  };
}

export function serializeStaff(s: StaffModel): StaffDto {
  return {
    id: s.id,
    uuid: s.uuid || s.id,
    active: s.active !== false,
    username: clean(s.username),
    displayName: clean(s.displayName) || clean(s.username) || s.uuid || s.id,
    role: clean(s.role),
    email: clean(s.email),
    phone: clean(s.phone),
  };
}

export function serializeSearchPage<T, U>(
  page: FhirSearchPage<T>,
  mapItem: (item: T) => U
): SearchPageDto<U> {
  return {
    total: page.total,
    items: page.items.map(mapItem),
    hasNext: page.hasNext,
    hasPrevious: page.hasPrevious,
  };
}

export function serializeCalculationForm(form: EmployeeCalculationForm): CalculationFormDto {
  return {
    ruleSets: form.ruleSets.map((r) => ({ ...r })),
    parameters: form.parameters.map((p) => ({
      ...p,
      label: { ...p.label },
      optionSet: p.optionSet?.map((o) => ({ value: o.value, label: { ...o.label } })),
    })),
    values: { ...form.values },
  };
}
