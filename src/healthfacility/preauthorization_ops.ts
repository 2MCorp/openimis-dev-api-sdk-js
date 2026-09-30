/// <reference types="fhir" />

import { PreauthorizationModel } from "../models/preauthorization";
import PreauthorizationFhirConverter from "../fhir_converter/preauthorization";

export type BulkPreauthorizationError = {
  index: number;
  message: string;
};

export class BulkPreauthorizationResult {
  constructor(
    public readonly created: PreauthorizationModel[],
    public readonly errors: BulkPreauthorizationError[],
    public readonly message: string
  ) {}

  static fromJSON(
    payload: Record<string, unknown>,
    converter: PreauthorizationFhirConverter
  ): BulkPreauthorizationResult {
    const data =
      payload.data && typeof payload.data === "object"
        ? (payload.data as Record<string, unknown>)
        : {};

    const createdRaw = Array.isArray(data.created) ? data.created : [];
    const errorsRaw = Array.isArray(data.errors) ? data.errors : [];

    const created = createdRaw.map((item) =>
      converter.fromFhir(item as fhir4.Claim)
    );

    const errors: BulkPreauthorizationError[] = errorsRaw.map((item) => {
      const row = (item ?? {}) as Record<string, unknown>;
      return {
        index: Number(row.index ?? -1),
        message: String(row.error ?? row.message ?? "Unknown error"),
      };
    });

    return new BulkPreauthorizationResult(
      created,
      errors,
      String(payload.message ?? "")
    );
  }
}

/** Client-side required-field checks before create / bulk-create. */
export function validatePreauthorizationForCreate(
  item: PreauthorizationModel
): string | null {
  if (!item.patientChfId?.trim()) {
    return "patientChfId is required";
  }
  if (!item.hfToId?.trim()) {
    return "hfToId (referral_to) is required";
  }
  if (!item.primaryDiagnosis?.code?.trim()) {
    return "primaryDiagnosis.code is required";
  }
  if (!item.service?.code?.trim()) {
    return "service.code is required";
  }
  return null;
}

export function collectPreauthorizationValidationErrors(
  items: PreauthorizationModel[]
): BulkPreauthorizationError[] {
  const errors: BulkPreauthorizationError[] = [];
  items.forEach((item, index) => {
    const message = validatePreauthorizationForCreate(item);
    if (message) {
      errors.push({ index, message });
    }
  });
  return errors;
}
