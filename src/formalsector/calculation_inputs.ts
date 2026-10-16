import type { FieldError } from "../utils/field_error";

/**
 * Calculation inputs of an employee (PolicyHolderInsuree).
 *
 * Which values an employee needs (income, grade, ...) is not fixed by the portal: the
 * calculation rule sets of the employee's health package declare them as
 * `input_params` (openIMIS calculation module, CEL rules). The employer API serves
 * them at `employees/calculation-params/` and stores the values in the record's
 * `json_ext.calculation_rule`; the backend validates them again on save.
 */

export type CalculationParamType = "number" | "string" | "select" | "checkbox";

/** Translations keyed by language code, e.g. `{ en: "Income", fr: "Salaire" }`. */
export type CalculationLabel = Record<string, string>;

export type CalculationOption = { value: string; label: CalculationLabel };

export type CalculationParam = {
  name: string;
  type: CalculationParamType;
  label: CalculationLabel;
  /** Default as declared (always a string in the rule set). */
  default?: string;
  required: boolean;
  /** Frontend formula on the value, e.g. `INPUT>100`. */
  condition?: string;
  relevance?: string;
  /** Choices of a `select`. */
  optionSet?: CalculationOption[];
};

export type CalculationValue = number | string | boolean;
export type CalculationValues = Record<string, CalculationValue>;

export type CalculationRuleSetRef = { id: string; name: string };

/** Body of `GET employees/calculation-params/` and `employees/{uuid}/calculation-params/`. */
export type EmployeeCalculationForm = {
  formClass: string;
  policyHolderContributionPlanId?: string;
  ruleSets: CalculationRuleSetRef[];
  parameters: CalculationParam[];
  /** Values stored on the employee (detail route only). */
  values: CalculationValues;
};

/** Field name used in `FieldError`s for an input. */
export function calculationFieldName(name: string): string {
  return `calculationRule.${name}`;
}

const PARAM_TYPES: readonly CalculationParamType[] = ["number", "string", "select", "checkbox"];

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function parseLabel(raw: unknown, fallback: string): CalculationLabel {
  if (typeof raw === "string" && raw.trim()) return { en: raw };
  const out: CalculationLabel = {};
  for (const [lang, text] of Object.entries(asRecord(raw))) {
    if (typeof text === "string" && text.trim()) out[lang] = text;
  }
  return Object.keys(out).length ? out : { en: fallback };
}

function parseValues(raw: unknown): CalculationValues {
  const out: CalculationValues = {};
  for (const [name, value] of Object.entries(asRecord(raw))) {
    if (typeof value === "number" || typeof value === "string" || typeof value === "boolean") {
      out[name] = value;
    }
  }
  return out;
}

export function parseCalculationParam(raw: unknown): CalculationParam | undefined {
  const p = asRecord(raw);
  const name = typeof p.name === "string" ? p.name.trim() : "";
  if (!name) return undefined;
  const type = PARAM_TYPES.includes(p.type as CalculationParamType)
    ? (p.type as CalculationParamType)
    : "string";
  const rawOptions = p.option_set ?? p.optionSet;
  const optionSet = Array.isArray(rawOptions)
    ? rawOptions
        .map((o) => asRecord(o))
        .filter((o) => o.value != null)
        .map((o) => ({ value: String(o.value), label: parseLabel(o.label, String(o.value)) }))
    : undefined;
  return {
    name,
    type,
    label: parseLabel(p.label, name),
    default: p.default == null || p.default === "" ? undefined : String(p.default),
    required: p.required === true,
    condition: typeof p.condition === "string" && p.condition.trim() ? p.condition : undefined,
    relevance: typeof p.relevance === "string" ? p.relevance : undefined,
    optionSet: type === "select" ? optionSet ?? [] : undefined,
  };
}

export function parseEmployeeCalculationForm(data: unknown): EmployeeCalculationForm {
  const d = asRecord(data);
  const ruleSets = Array.isArray(d.rule_sets)
    ? d.rule_sets
        .map((r) => asRecord(r))
        .filter((r) => r.id != null)
        .map((r) => ({ id: String(r.id), name: String(r.name ?? r.id) }))
    : [];
  const parameters = Array.isArray(d.parameters)
    ? d.parameters.map(parseCalculationParam).filter((p): p is CalculationParam => !!p)
    : [];
  const planId = d.policy_holder_contribution_plan_id;
  return {
    formClass: typeof d.class === "string" ? d.class : "PolicyHolderInsuree",
    policyHolderContributionPlanId: planId == null ? undefined : String(planId),
    ruleSets,
    parameters,
    values: parseValues(d.values),
  };
}

/**
 * Text of a label for `locale` (`fr-CA` → `fr`), falling back to English and then to
 * any translation.
 */
export function calculationLabel(label: CalculationLabel | undefined, locale = "en"): string {
  if (!label) return "";
  const lang = locale.toLowerCase();
  return (
    label[lang] ??
    label[lang.split("-")[0]] ??
    label.en ??
    Object.values(label).find((text) => !!text) ??
    ""
  );
}

/** Label of a select's value, or the value itself. */
export function calculationOptionLabel(
  param: CalculationParam,
  value: CalculationValue | undefined,
  locale = "en"
): string {
  if (value == null) return "";
  const option = param.optionSet?.find((o) => o.value === String(value));
  return option ? calculationLabel(option.label, locale) : String(value);
}

const CONDITION_RE = /^\s*INPUT\s*(>=|<=|==|!=|=|>|<)\s*(-?\d+(?:\.\d+)?)\s*$/;

/**
 * Checks `INPUT <op> number` conditions — the form the backend enforces. Returns
 * `undefined` for formulas it does not understand (they are not checked).
 */
export function checkCalculationCondition(
  condition: string | undefined,
  value: number
): boolean | undefined {
  if (!condition) return undefined;
  const match = CONDITION_RE.exec(condition);
  if (!match) return undefined;
  const limit = Number(match[2]);
  switch (match[1]) {
    case ">":
      return value > limit;
    case ">=":
      return value >= limit;
    case "<":
      return value < limit;
    case "<=":
      return value <= limit;
    case "!=":
      return value !== limit;
    default:
      return value === limit;
  }
}

function isBlank(value: unknown): boolean {
  return value == null || (typeof value === "string" && value.trim() === "");
}

function toBoolean(value: unknown): boolean | undefined {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  const text = String(value).trim().toLowerCase();
  if (["true", "1", "yes", "on"].includes(text)) return true;
  if (["false", "0", "no", "off", ""].includes(text)) return false;
  return undefined;
}

/** Typed value of a declared default (`"3"` → 3 for numbers, `"False"` → false). */
export function calculationDefault(param: CalculationParam): CalculationValue | undefined {
  if (param.default == null) return undefined;
  if (param.type === "number") {
    const n = Number(param.default);
    return Number.isFinite(n) ? n : undefined;
  }
  if (param.type === "checkbox") return toBoolean(param.default);
  return param.default;
}

/** Initial form values: stored values first, then declared defaults. */
export function initialCalculationValues(
  parameters: readonly CalculationParam[],
  stored: CalculationValues = {}
): CalculationValues {
  const out: CalculationValues = {};
  for (const param of parameters) {
    const value = stored[param.name] ?? calculationDefault(param);
    if (value !== undefined) out[param.name] = value;
  }
  return out;
}

/**
 * Validates and types raw form values against `parameters` — the same rules as the
 * backend (`calculation.input_params.coerce_input_values`): undeclared names are
 * dropped, blanks take the default, required inputs must be set, numbers must parse
 * and meet their condition, selects must be one of the options.
 */
export function coerceCalculationValues(
  parameters: readonly CalculationParam[],
  raw: Record<string, unknown> | undefined
): { values: CalculationValues; errors: FieldError[] } {
  const values: CalculationValues = {};
  const errors: FieldError[] = [];
  const input = raw ?? {};
  for (const param of parameters) {
    const field = calculationFieldName(param.name);
    const label = calculationLabel(param.label);
    let value: unknown = input[param.name];
    if (isBlank(value)) value = param.default;
    if (isBlank(value)) {
      if (param.required) errors.push({ field, message: `${label} is required` });
      continue;
    }
    switch (param.type) {
      case "number": {
        const n = typeof value === "number" ? value : Number(String(value).trim());
        if (!Number.isFinite(n)) {
          errors.push({ field, message: `${label} must be a number` });
          break;
        }
        if (checkCalculationCondition(param.condition, n) === false) {
          errors.push({ field, message: `${label} does not meet the condition ${param.condition}` });
          break;
        }
        values[param.name] = n;
        break;
      }
      case "checkbox": {
        const b = toBoolean(value);
        if (b === undefined) errors.push({ field, message: `${label} must be true or false` });
        else values[param.name] = b;
        break;
      }
      case "select": {
        const text = String(value);
        if (!param.optionSet?.some((o) => o.value === text)) {
          errors.push({ field, message: `${label} must be one of the listed options` });
        } else values[param.name] = text;
        break;
      }
      default:
        values[param.name] = String(value);
    }
  }
  return { values, errors };
}

/**
 * Backend validation errors on calculation inputs — `{ calculation_rule: { income: "..." } }`
 * in a 400 body (also under `policy_holder_contribution_plan_id`) — as FieldErrors.
 * Client-side FieldErrors are passed through.
 */
export function calculationFieldErrors(details: readonly unknown[] | undefined): FieldError[] {
  const out: FieldError[] = [];
  for (const detail of details ?? []) {
    const record = asRecord(detail);
    if (typeof record.field === "string" && typeof record.message === "string") {
      out.push({ field: record.field, message: record.message });
      continue;
    }
    const nested = record.calculation_rule;
    if (typeof nested === "string") {
      out.push({ field: "calculationRule", message: nested });
    } else {
      for (const [name, message] of Object.entries(asRecord(nested))) {
        const text = Array.isArray(message) ? message.map(String).join(" ") : String(message);
        out.push({
          field: name === "__all__" ? "calculationRule" : calculationFieldName(name),
          message: name === "__all__" ? text : `${name} ${text}`,
        });
      }
    }
    const plan = record.policy_holder_contribution_plan_id;
    if (plan != null) {
      out.push({
        field: "policyHolderContributionPlanId",
        message: Array.isArray(plan) ? plan.map(String).join(" ") : String(plan),
      });
    }
  }
  return out;
}

/**
 * CSV template for the bulk upload: `chf_id`, one column per input of the package and
 * `policy_holder_contribution_plan_id` (bundle code). Example values use defaults.
 */
export function employeeUploadTemplateCsv(
  parameters: readonly CalculationParam[],
  planCode = "PLANCODE"
): string {
  const csvCell = (value: string) => (/[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value);
  const header = ["chf_id", ...parameters.map((p) => p.name), "policy_holder_contribution_plan_id"];
  const example = [
    "070707092",
    ...parameters.map((p) => {
      const value = calculationDefault(p);
      if (value !== undefined) return String(value);
      if (p.type === "select") return p.optionSet?.[0]?.value ?? "";
      if (p.type === "checkbox") return "false";
      return "";
    }),
    planCode,
  ];
  return `${header.map(csvCell).join(",")}\r\n${example.map(csvCell).join(",")}\r\n`;
}
