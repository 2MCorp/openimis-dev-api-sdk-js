import { EmployeeModel } from "../models/employee";

import type { FieldError } from "../utils/field_error";
import {
  CalculationParam,
  CalculationValues,
  coerceCalculationValues,
} from "./calculation_inputs";

export type { FieldError };

/** Link an existing insuree to the employer on a health package. */
export type EmployeeEnrollmentInput = {
  /** Insuree CHF ID (or insuree UUID). */
  chfId: string;
  /** PolicyHolderContributionPlan id from `insurancePlans.listEnrollablePackages()`. */
  policyHolderContributionPlanId: string;
  /**
   * Calculation inputs (income, ...) as declared by the package — see
   * `employees.calculationParams`. Only the declared inputs are sent.
   */
  calculationRule?: Record<string, unknown>;
  /** Parameters from `employees.calculationParams(planId)`, to validate `calculationRule`. */
  calculationParams?: readonly CalculationParam[];
};

/**
 * Typed calculation values for an input; `errors` is non-empty when they do not match
 * the parameters. Without parameters the values are passed through for the backend.
 */
function calculationValuesFor(
  calculationRule: Record<string, unknown> | undefined,
  parameters: readonly CalculationParam[] | undefined
): { values?: CalculationValues; errors: FieldError[] } {
  if (calculationRule == null) return { values: undefined, errors: [] };
  if (!parameters) return { values: calculationRule as CalculationValues, errors: [] };
  return coerceCalculationValues(parameters, calculationRule);
}

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
  if (input.calculationParams) {
    errors.push(...calculationValuesFor(input.calculationRule ?? {}, input.calculationParams).errors);
  }
  return errors;
}

/**
 * EmployeeModel shaped for `POST employees/`. The backend
 * (`EmployeeConverter.to_imis_obj`) resolves the insuree from the first identifier and
 * accepts only the `PolicyHolderContributionPlanID`, `calculation-rule` and legacy
 * `employee-income` extensions — so the bundle display is left unset. Calculation
 * inputs are sent only when the package declares them (the backend applies defaults).
 */
export function employeeModelForEnrollment(input: EmployeeEnrollmentInput): EmployeeModel {
  const { values } = calculationValuesFor(
    input.calculationRule ?? (input.calculationParams ? {} : undefined),
    input.calculationParams
  );
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
    undefined,
    undefined,
    input.policyHolderContributionPlanId.trim(),
    undefined,
    values && Object.keys(values).length ? values : undefined
  );
}

/**
 * Change an employee's health package and/or calculation inputs
 * (`PATCH employees/{uuid}/`). Stored inputs the (new) package still declares are kept.
 */
export type EmployeeUpdateInput = {
  /** PolicyHolderContributionPlan id from `insurancePlans.listEnrollablePackages()`. */
  policyHolderContributionPlanId?: string;
  calculationRule?: Record<string, unknown>;
  /** Parameters of the (new) package, to validate `calculationRule` before sending. */
  calculationParams?: readonly CalculationParam[];
};

export function validateEmployeeUpdate(input: EmployeeUpdateInput): FieldError[] {
  const errors: FieldError[] = [];
  const planId = input.policyHolderContributionPlanId?.trim();
  if (!planId && input.calculationRule == null) {
    errors.push({ field: "policyHolderContributionPlanId", message: "Nothing to update" });
  }
  errors.push(...calculationValuesFor(input.calculationRule, input.calculationParams).errors);
  return errors;
}

/** JSON body of `PATCH employees/{uuid}/` for a validated update. */
export function employeeUpdateBody(input: EmployeeUpdateInput): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  const planId = input.policyHolderContributionPlanId?.trim();
  if (planId) body.policy_holder_contribution_plan_id = planId;
  const { values } = calculationValuesFor(input.calculationRule, input.calculationParams);
  if (values) body.calculation_rule = values;
  return body;
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

/**
 * Minimal CSV template accepted by the upload. Columns for calculation inputs depend
 * on the package — build a full template with `employeeUploadTemplateCsv(parameters)`.
 */
export const EMPLOYEE_UPLOAD_TEMPLATE_CSV =
  "chf_id,policy_holder_contribution_plan_id\r\n070707092,PLANCODE\r\n";

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
