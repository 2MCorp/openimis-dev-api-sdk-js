import type {
  CalculationLabel,
  CalculationParam,
  CalculationValue,
  CalculationValues,
} from "../../formalsector/calculation_inputs";

/**
 * Display helpers for calculation inputs (income, ...). Which inputs exist, their
 * types and rules come from the package's calculation rule sets (server); the UI only
 * formats and collects values. Locale and yes/no words are passed in by the UI layer.
 */

/** Form state of one input: text for number/string/select, boolean for checkbox. */
export type CalculationFormValues = Record<string, string | boolean>;

export type CalculationTextOptions = {
  /** UI language (`en`, `fr`, ...). */
  locale?: string;
  /** Words for boolean values. */
  yes?: string;
  no?: string;
  /** Shown for an empty value. */
  fallback?: string;
};

/** Label in the UI language, then English, then any translation. */
export function calculationText(
  label: CalculationLabel | undefined,
  locale = "en",
  fallback = ""
): string {
  if (!label) return fallback;
  return label[locale] ?? label.en ?? Object.values(label).find(Boolean) ?? fallback;
}

/** `annual_income` → `Annual income` (inputs a package no longer declares). */
export function humanizeInputName(name: string): string {
  const text = name.replace(/[_-]+/g, " ").trim();
  return text ? text[0].toUpperCase() + text.slice(1) : name;
}

export function calculationParamLabel(param: CalculationParam, locale = "en"): string {
  return calculationText(param.label, locale, humanizeInputName(param.name));
}

/** Human text of a stored value. */
export function formatCalculationValue(
  param: CalculationParam | undefined,
  value: CalculationValue | undefined,
  options: CalculationTextOptions = {}
): string {
  const { locale = "en", yes = "Yes", no = "No", fallback = "—" } = options;
  if (value === undefined || value === "") return fallback;
  if (typeof value === "boolean") return value ? yes : no;
  if (param?.type === "select") {
    const option = param.optionSet?.find((o) => o.value === String(value));
    if (option) return calculationText(option.label, locale, option.value);
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? value.toLocaleString(locale) : fallback;
  }
  return String(value);
}

export type CalculationEntry = { name: string; label: string; value: string };

/**
 * Stored values as label/value rows: declared inputs in rule-set order, then values the
 * package no longer declares.
 */
export function calculationEntries(
  values: CalculationValues | undefined,
  parameters: readonly CalculationParam[] = [],
  options: CalculationTextOptions = {}
): CalculationEntry[] {
  const stored = values ?? {};
  const rows: CalculationEntry[] = parameters.map((p) => ({
    name: p.name,
    label: calculationParamLabel(p, options.locale),
    value: formatCalculationValue(p, stored[p.name], options),
  }));
  for (const [name, value] of Object.entries(stored)) {
    if (parameters.some((p) => p.name === name)) continue;
    rows.push({
      name,
      label: humanizeInputName(name),
      value: formatCalculationValue(undefined, value, options),
    });
  }
  return rows;
}

/** Initial form state: stored values, else the declared default. */
export function calculationFormValues(
  parameters: readonly CalculationParam[],
  stored: CalculationValues = {}
): CalculationFormValues {
  const out: CalculationFormValues = {};
  for (const p of parameters) {
    const value = stored[p.name] ?? p.default;
    if (p.type === "checkbox") {
      out[p.name] = value === true || String(value ?? "").toLowerCase() === "true";
    } else {
      out[p.name] = value == null ? "" : String(value);
    }
  }
  return out;
}

/** Request body values: declared inputs only, blanks left out (the server applies defaults). */
export function calculationPayload(
  parameters: readonly CalculationParam[],
  values: CalculationFormValues
): Record<string, string | boolean> {
  const out: Record<string, string | boolean> = {};
  for (const p of parameters) {
    const value = values[p.name];
    if (typeof value === "boolean") out[p.name] = value;
    else if (value != null && value.trim() !== "") out[p.name] = value.trim();
  }
  return out;
}

const CONDITION_RE = /^\s*INPUT\s*(>=|<=|==|!=|=|>|<)\s*(-?\d+(?:\.\d+)?)\s*$/;

/** `INPUT>100` → `> 100` for a hint; undefined for formulas it does not read. */
export function conditionHint(condition: string | undefined, locale = "en"): string | undefined {
  const match = condition ? CONDITION_RE.exec(condition) : null;
  if (!match) return undefined;
  const symbols: Record<string, string> = { ">=": "≥", "<=": "≤", "==": "=", "=": "=", "!=": "≠" };
  return `${symbols[match[1]] ?? match[1]} ${Number(match[2]).toLocaleString(locale)}`;
}
