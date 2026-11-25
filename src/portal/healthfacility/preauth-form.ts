import type { PreauthListItemDto } from "./types";

/** Values of the pre-authorization create / edit / bulk form rows. */
export type PreauthFormValues = {
  patientChfId: string;
  patientName: string;
  hfToId: string;
  hfToDisplay: string;
  primaryDiagnosisCode: string;
  primaryDiagnosisName: string;
  serviceCode: string;
  serviceName: string;
  explanation: string;
};

export type PreauthFormInitial = PreauthFormValues & { id?: string; uuid?: string };

export function emptyPreauthFormValues(): PreauthFormValues {
  return {
    patientChfId: "",
    patientName: "",
    hfToId: "",
    hfToDisplay: "",
    primaryDiagnosisCode: "",
    primaryDiagnosisName: "",
    serviceCode: "",
    serviceName: "",
    explanation: "",
  };
}

/** Normalise partial initial values into a complete form value set. */
export function buildPreauthFormValues(src?: Partial<PreauthFormValues>): PreauthFormValues {
  const base = emptyPreauthFormValues();
  if (!src) return base;
  for (const key of Object.keys(base) as (keyof PreauthFormValues)[]) base[key] = src[key] ?? "";
  return base;
}

/** Edit-form initial values (plus ids) from a list row. */
export function preauthInitialFromItem(item: PreauthListItemDto): PreauthFormInitial {
  return {
    id: item.id,
    uuid: item.uuid,
    patientChfId: item.patientChfId ?? "",
    patientName: item.patientName ?? "",
    hfToId: item.hfToId ?? "",
    hfToDisplay: item.hfToDisplay ?? "",
    primaryDiagnosisCode: item.primaryDiagnosis?.code ?? "",
    primaryDiagnosisName: item.primaryDiagnosis?.name ?? "",
    serviceCode: item.service?.code ?? "",
    serviceName: item.service?.name ?? item.serviceName ?? "",
    explanation: item.explanation ?? "",
  };
}

const REQUIRED_FIELDS = ["patientChfId", "hfToId", "primaryDiagnosisCode", "serviceCode"] as const;

/** Per-field "required" messages (empty object = valid). */
export function validatePreauthForm(
  values: PreauthFormValues,
  requiredMessage: string,
): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const field of REQUIRED_FIELDS) {
    if (!values[field].trim()) errors[field] = requiredMessage;
  }
  return errors;
}

/** JSON body posted to `/api/preauthorizations` (create) or `/api/preauthorizations/:id` (PUT). */
export function preauthRequestBody(values: PreauthFormValues, meta: { id?: string; uuid?: string } = {}) {
  return {
    patientChfId: values.patientChfId,
    patientName: values.patientName,
    hfToId: values.hfToId,
    hfToDisplay: values.hfToDisplay,
    primaryDiagnosisCode: values.primaryDiagnosisCode,
    primaryDiagnosisName: values.primaryDiagnosisName,
    serviceCode: values.serviceCode,
    serviceName: values.serviceName,
    explanation: values.explanation,
    ...(meta.uuid ? { uuid: meta.uuid } : {}),
    ...(meta.id ? { id: meta.id } : {}),
  };
}

/** Id used in the PUT URL (uuid preferred). */
export function preauthEditId(meta: { id?: string; uuid?: string }): string | undefined {
  return meta.uuid || meta.id || undefined;
}
