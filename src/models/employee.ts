import type { CalculationValues } from "../formalsector/calculation_inputs";

export class EmployeeModel {
  constructor(
    public id: string,
    public lastName: string,
    public otherNames: string,
    public chfId: string,
    /**
     * `MR` identifier — the backend sends the PolicyHolderInsuree record id here
     * (a UUID in current openIMIS), not a human employee number. Show `chfId` instead.
     */
    public employeeId?: string,
    public employeeUuid?: string,
    public insureeUuid?: string,
    public birthDate?: string,
    public maritalStatus?: string,
    /** Legacy `employee-income` value; prefer `calculationRule.income`. */
    public income?: number,
    public contributionPlanBundleDisplay?: string,
    public contributionPlanBundleId?: string,
    public contributionPlanBundleUuid?: string,
    /**
     * Calculation inputs stored on the employee (`json_ext.calculation_rule`), as
     * declared by the package's calculation rule sets — see `employees.calculationParams`.
     */
    public calculationRule?: CalculationValues
  ) {}

  get fullName(): string {
    return `${this.otherNames} ${this.lastName}`.trim();
  }

  /** Bundle code from the backend's `CODE/Name` contributionPlanBundleId display. */
  get contributionPlanBundleCode(): string | undefined {
    return splitBundleDisplay(this.contributionPlanBundleDisplay).code;
  }

  /** Bundle name from the backend's `CODE/Name` contributionPlanBundleId display. */
  get contributionPlanBundleName(): string | undefined {
    return splitBundleDisplay(this.contributionPlanBundleDisplay).name;
  }
}

/** `CODE/Name` → parts; a value without `/` is treated as the name. */
export function splitBundleDisplay(display: string | undefined): {
  code?: string;
  name?: string;
} {
  const value = display?.trim();
  if (!value) return {};
  const slash = value.indexOf("/");
  if (slash < 0) return { name: value };
  const code = value.slice(0, slash).trim() || undefined;
  const name = value.slice(slash + 1).trim() || value;
  return { code, name };
}
