import { z } from "zod";

/**
 * Request-body shapes only (JSON -> typed input). Business rules — required fields,
 * package ownership, upload types and size, contract dates — are enforced by the SDK
 * (`enrollEmployee`, `employees.uploadFile`, `contracts.createDraft`).
 */
// A missing/null field becomes "" (plain `z.coerce.string()` would turn `undefined` into "undefined").
const text = z.preprocess((v) => (v == null ? "" : v), z.coerce.string()).catch("");

/** Calculation inputs by name; which names and types are valid is checked by the SDK. */
const calculationRule = z.record(z.string(), z.unknown()).optional().catch(undefined);

export const addEmployeeBody = z.object({
  chfId: text,
  policyHolderContributionPlanId: text,
  calculationRule,
});

export const updateEmployeeBody = z.object({
  policyHolderContributionPlanId: z.string().trim().optional().catch(undefined),
  calculationRule,
});

export const uploadEmployeesBody = z.object({
  fileName: text,
  base64: text,
  defaultPlanCode: z.string().trim().optional().catch(undefined),
});

export const createContractBody = z.object({
  code: text,
  dateValidFrom: text,
  dateValidTo: text,
});

const trimmed = z.string().trim().catch("");

/** Browser -> portal: which contract to pay and how. Amount/currency come from the backend. */
export const payContractBody = z.object({
  contractId: trimmed,
  providerCode: trimmed,
  paymentMethodCode: trimmed,
  idempotencyKey: z.string().trim().max(100).optional().catch(undefined),
});
