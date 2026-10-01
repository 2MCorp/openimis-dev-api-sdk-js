import { EmployeeModel } from "../models/employee";

import type { FieldError } from "../utils/field_error";

export type { FieldError };

/** Link an existing insuree to the employer on a health package. */
export type EmployeeEnrollmentInput = {
  /** Insuree CHF ID (or insuree UUID). */
  chfId: string;
  /** PolicyHolderContributionPlan id from `insurancePlans.listEnrollablePackages()`. */
  policyHolderContributionPlanId: string;
  /** Salary used by the contribution calculation rule. */
  income?: number;
};

export function validateEmployeeEnrollment(input: EmployeeEnrollmentInput): FieldError[] {
  const errors: FieldError[] = [];
  if (!input.chfId?.trim()) {
    errors.push({ field: "chfId", message: "Insuree CHF ID is required" });
  }
  if (!input.policyHolderContributionPlanId?.trim()) {
    errors.push({
      field: "policyHolderContributionPlanId",
      message: "Health package is required",
    });
  }
  if (input.income != null && (!Number.isFinite(input.income) || input.income < 0)) {
    errors.push({ field: "income", message: "Income must be a non-negative number" });
  }
  return errors;
}

/**
 * EmployeeModel shaped for `POST employees/`. The backend
 * (`EmployeeConverter.to_imis_obj`) resolves the insuree from the first identifier and
 * rejects any extension other than `PolicyHolderContributionPlanID` and
 * `employee-income` — so the bundle display is left unset and income is always sent.
 */
export function employeeModelForEnrollment(input: EmployeeEnrollmentInput): EmployeeModel {
  return new EmployeeModel(
    "",
    "",
    "",
    input.chfId.trim(),
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    input.income ?? 0,
    undefined,
    input.policyHolderContributionPlanId.trim()
  );
}

/** Change an employee's health package and/or income (`PATCH employees/{uuid}/`). */
export type EmployeeUpdateInput = {
  /** PolicyHolderContributionPlan id from `insurancePlans.listEnrollablePackages()`. */
  policyHolderContributionPlanId?: string;
  income?: number;
};

export function validateEmployeeUpdate(input: EmployeeUpdateInput): FieldError[] {
  const errors: FieldError[] = [];
  const planId = input.policyHolderContributionPlanId?.trim();
  if (!planId && input.income == null) {
    errors.push({ field: "policyHolderContributionPlanId", message: "Nothing to update" });
  }
  if (input.income != null && (!Number.isFinite(input.income) || input.income < 0)) {
    errors.push({ field: "income", message: "Income must be a non-negative number" });
  }
  return errors;
}

/**
 * File types accepted by `employees/upload-binary/` (by extension). Legacy `.xls` is
 * rejected by the backend ("Legacy .xls is not supported"), so only xlsx is offered.
 */
export const EMPLOYEE_UPLOAD_CONTENT_TYPES = {
  csv: "text/csv",
  json: "application/json",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
} as const;

/**
 * The Binary is sent base64-encoded in a JSON body (≈ 4/3 size). openIMIS caps request
 * bodies at `DATA_UPLOAD_MAX_MEMORY_SIZE` (10 MB default), so 5 MB of file fits.
 */
export const EMPLOYEE_UPLOAD_MAX_BYTES = 5 * 1024 * 1024;

/** CSV template accepted by the upload (header aliases are resolved server-side). */
export const EMPLOYEE_UPLOAD_TEMPLATE_CSV =
  "chf_id,income,policy_holder_contribution_plan_id\r\n070707092,4500,PLANCODE\r\n";

export function employeeUploadContentType(fileName: string): string | undefined {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  return (EMPLOYEE_UPLOAD_CONTENT_TYPES as Record<string, string>)[ext];
}

export type EmployeeUploadInput = {
  fileName: string;
  /** File bytes as base64 (no `data:` prefix). */
  base64: string;
  /** Bundle code or name applied to rows without a package column. */
  defaultPlanCode?: string;
};

export function validateEmployeeUpload(input: EmployeeUploadInput): FieldError[] {
  const errors: FieldError[] = [];
  const contentType = employeeUploadContentType(input.fileName);
  if (!contentType) {
    errors.push({ field: "file", message: "Upload a CSV, XLSX or JSON file" });
  }
  if (!input.base64) {
    errors.push({ field: "file", message: "The file is empty" });
  } else if ((input.base64.length * 3) / 4 > EMPLOYEE_UPLOAD_MAX_BYTES) {
    errors.push({ field: "file", message: "The file is too large (max 5 MB)" });
  }
  return errors;
}
