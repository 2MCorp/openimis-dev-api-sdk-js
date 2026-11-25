import type { ContractDraftInput } from "../../formalsector/contract_ops";
import type {
  EmployeeEnrollmentInput,
  EmployeeUpdateInput,
  EmployeeUploadInput,
} from "../../formalsector/employee_ops";

/**
 * Request-body shapes only (untrusted JSON → typed input). Business rules — required
 * fields, package ownership, upload types and size, contract dates — are enforced by the
 * SDK (`enrollEmployee`, `employees.uploadFile`, `contracts.createDraft`), so malformed
 * values are coerced to empty strings for the SDK to reject.
 */

function record(raw: unknown): Record<string, unknown> {
  return raw && typeof raw === "object" && !Array.isArray(raw)
    ? (raw as Record<string, unknown>)
    : {};
}

/** Missing / non-scalar → `""`; numbers and booleans are stringified. */
function text(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
}

function optionalTrimmed(value: unknown): string | undefined {
  return typeof value === "string" ? value.trim() : undefined;
}

function calculationRule(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

export function parseAddEmployeeBody(raw: unknown): EmployeeEnrollmentInput {
  const body = record(raw);
  return {
    chfId: text(body.chfId),
    policyHolderContributionPlanId: text(body.policyHolderContributionPlanId),
    calculationRule: calculationRule(body.calculationRule),
  };
}

export function parseUpdateEmployeeBody(raw: unknown): EmployeeUpdateInput {
  const body = record(raw);
  return {
    policyHolderContributionPlanId: optionalTrimmed(body.policyHolderContributionPlanId),
    calculationRule: calculationRule(body.calculationRule),
  };
}

export function parseUploadEmployeesBody(raw: unknown): EmployeeUploadInput {
  const body = record(raw);
  return {
    fileName: text(body.fileName),
    base64: text(body.base64),
    defaultPlanCode: optionalTrimmed(body.defaultPlanCode),
  };
}

export function parseCreateContractBody(raw: unknown): ContractDraftInput {
  const body = record(raw);
  return {
    code: text(body.code),
    dateValidFrom: text(body.dateValidFrom),
    dateValidTo: text(body.dateValidTo),
  };
}

export type PayContractBody = {
  contractId: string;
  providerCode: string;
  paymentMethodCode: string;
  idempotencyKey?: string;
};

/**
 * Browser → portal: which contract to pay and how. Amount and currency are never read
 * from the body — the backend sets them.
 */
export function parsePayContractBody(raw: unknown): PayContractBody {
  const body = record(raw);
  const trimmed = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const key = typeof body.idempotencyKey === "string" ? body.idempotencyKey.trim() : undefined;
  return {
    contractId: trimmed(body.contractId),
    providerCode: trimmed(body.providerCode),
    paymentMethodCode: trimmed(body.paymentMethodCode),
    idempotencyKey: key !== undefined && key.length <= 100 ? key : undefined,
  };
}
