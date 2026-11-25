import { splitClaimLines } from "./claim-lines";
import { toDateInputValue } from "./claim-record";
import type { ClaimLineDto, ClaimListItemDto } from "./types";

/** Form-state model of the claim / encounter create, edit and bulk forms (all strings). */
export type ClaimLineForm = {
  code: string;
  name: string;
  category: "service" | "item";
  quantity: string;
  unitPrice: string;
};

export type ClaimFormValues = {
  dateFrom: string;
  dateTo: string;
  visitType: string;
  guaranteeId: string;
  explanation: string;
  primaryDiagnosisCode: string;
  primaryDiagnosisName: string;
  secondaryDiagnosisCode: string;
  secondaryDiagnosisName: string;
  services: ClaimLineForm[];
  items: ClaimLineForm[];
};

export type ClaimBulkRowValues = {
  patientChfId: string;
  patientName: string;
  dateFrom: string;
  dateTo: string;
  visitType: string;
  primaryDiagnosisCode: string;
  primaryDiagnosisName: string;
  services: ClaimLineForm[];
  items: ClaimLineForm[];
};

export function emptyClaimLine(category: "service" | "item" = "service"): ClaimLineForm {
  return { code: "", name: "", category, quantity: "1", unitPrice: "" };
}

export function emptyClaimFormValues(): ClaimFormValues {
  return {
    dateFrom: "",
    dateTo: "",
    visitType: "O",
    guaranteeId: "",
    explanation: "",
    primaryDiagnosisCode: "",
    primaryDiagnosisName: "",
    secondaryDiagnosisCode: "",
    secondaryDiagnosisName: "",
    services: [emptyClaimLine("service")],
    items: [],
  };
}

export function emptyClaimBulkRowValues(visitType = "O"): ClaimBulkRowValues {
  return {
    patientChfId: "",
    patientName: "",
    dateFrom: "",
    dateTo: "",
    visitType,
    primaryDiagnosisCode: "",
    primaryDiagnosisName: "",
    services: [emptyClaimLine("service")],
    items: [],
  };
}

/** Lines the user actually filled in (have a code). */
export function filledLines(lines: ClaimLineForm[]): ClaimLineForm[] {
  return lines.filter((line) => line.code.trim());
}

function toFormLine(line: ClaimLineDto, category: "service" | "item"): ClaimLineForm {
  return {
    code: line.code,
    name: line.code,
    category,
    quantity: line.quantity != null ? String(line.quantity) : "1",
    unitPrice: line.unitPrice != null ? String(line.unitPrice) : "",
  };
}

/** Edit-form initial values from a loaded claim / encounter. */
export function claimFormValuesFromItem(
  src: ClaimListItemDto,
  kind: "claim" | "encounter",
): ClaimFormValues {
  const diagnoses = src.diagnoses ?? [];
  const primary = diagnoses[0];
  const secondary = diagnoses[1];
  const { services, items } = splitClaimLines(src.items);
  return {
    dateFrom: toDateInputValue(src.dateFrom || src.created),
    dateTo: toDateInputValue(src.dateTo),
    visitType: kind === "encounter" ? "C" : src.visitType || "O",
    guaranteeId: src.guaranteeId ?? "",
    explanation: src.explanation ?? "",
    primaryDiagnosisCode: primary?.code ?? "",
    primaryDiagnosisName: primary?.display ?? primary?.code ?? "",
    secondaryDiagnosisCode: secondary?.code ?? "",
    secondaryDiagnosisName: secondary?.display ?? secondary?.code ?? "",
    services: services.length
      ? services.map((line) => toFormLine(line, "service"))
      : src.items?.length
        ? []
        : [emptyClaimLine("service")],
    items: items.map((line) => toFormLine(line, "item")),
  };
}

/** Error messages used by the validators (the UI passes translated strings). */
export type ClaimFormMessages = { required: string; atLeastOneLine: string };

function requireFields(
  values: object,
  fields: string[],
  errs: Record<string, string>,
  required: string,
) {
  for (const field of fields) {
    if (!String((values as Record<string, unknown>)[field] ?? "").trim()) errs[field] = required;
  }
}

/** Partially filled lines need a code; at least one line overall. */
export function collectLineErrors(
  values: { services: ClaimLineForm[]; items: ClaimLineForm[] },
  errs: Record<string, string>,
  messages: ClaimFormMessages,
): void {
  for (const [group, lines] of [
    ["services", values.services],
    ["items", values.items],
  ] as const) {
    lines.forEach((line, index) => {
      const hasPartial = Boolean(line.quantity?.trim()) || Boolean(line.unitPrice?.trim());
      if (!line.code.trim() && hasPartial) errs[`${group}.${index}.code`] = messages.required;
    });
  }
  if (filledLines(values.services).length + filledLines(values.items).length === 0) {
    errs.lines = messages.atLeastOneLine;
  }
}

/** Edit form validation: date from, primary diagnosis and lines. Empty object = valid. */
export function validateClaimFormValues(
  values: ClaimFormValues,
  messages: ClaimFormMessages,
): Record<string, string> {
  const errs: Record<string, string> = {};
  requireFields(values, ["dateFrom", "primaryDiagnosisCode"], errs, messages.required);
  collectLineErrors(values, errs, messages);
  return errs;
}

/** Bulk row validation: patient, date from, primary diagnosis and lines. */
export function validateBulkRowValues(
  values: ClaimBulkRowValues,
  messages: ClaimFormMessages,
): Record<string, string> {
  const errs: Record<string, string> = {};
  requireFields(values, ["patientChfId", "dateFrom", "primaryDiagnosisCode"], errs, messages.required);
  collectLineErrors(values, errs, messages);
  return errs;
}

type WriteLine = {
  code: string;
  category: "service" | "item";
  quantity: number | undefined;
  unitPrice: number | undefined;
};

/** Filled service + item lines as write-body lines. */
export function formLinesToWrite(values: {
  services: ClaimLineForm[];
  items: ClaimLineForm[];
}): WriteLine[] {
  const map = (line: ClaimLineForm, category: "service" | "item"): WriteLine => ({
    code: line.code.trim(),
    category,
    quantity: line.quantity ? Number(line.quantity) : undefined,
    unitPrice: line.unitPrice ? Number(line.unitPrice) : undefined,
  });
  return [
    ...filledLines(values.services).map((l) => map(l, "service")),
    ...filledLines(values.items).map((l) => map(l, "item")),
  ];
}

/** PUT body of the claim / encounter edit form. */
export function claimEditWriteBody(
  item: ClaimListItemDto,
  values: ClaimFormValues,
  kind: "claim" | "encounter",
) {
  const diagnoses = [
    { code: values.primaryDiagnosisCode, display: values.primaryDiagnosisName || undefined },
    ...(values.secondaryDiagnosisCode
      ? [{ code: values.secondaryDiagnosisCode, display: values.secondaryDiagnosisName || undefined }]
      : []),
  ];
  return {
    id: item.id,
    code: item.code,
    uuid: item.uuid,
    status: item.status,
    patientChfId: item.patientChfId,
    providerId: item.providerId,
    dateFrom: values.dateFrom || undefined,
    dateTo: values.dateTo || undefined,
    visitType: kind === "encounter" ? "C" : values.visitType,
    guaranteeId: values.guaranteeId || undefined,
    explanation: values.explanation || undefined,
    diagnoses,
    items: formLinesToWrite(values),
  };
}

/** POST body for one bulk (manual) row. */
export function bulkRowWriteBody(values: ClaimBulkRowValues, kind: "claim" | "encounter") {
  const dateFrom = values.dateFrom.trim();
  return {
    patientChfId: values.patientChfId.trim(),
    dateFrom,
    dateTo: values.dateTo.trim() || dateFrom,
    visitType: kind === "encounter" ? "C" : values.visitType,
    diagnoses: [
      { code: values.primaryDiagnosisCode.trim(), display: values.primaryDiagnosisName || undefined },
    ],
    items: formLinesToWrite(values),
  };
}
