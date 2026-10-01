import { ContractModel } from "../models/contract";
import type { FieldError } from "../utils/field_error";

/** New draft contract for the employer (`POST contracts/`). */
export type ContractDraftInput = {
  code: string;
  /** `YYYY-MM-DD` */
  dateValidFrom: string;
  /** `YYYY-MM-DD` */
  dateValidTo: string;
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Mirrors `ContractConverter.to_imis_obj`: a code identifier and both
 * `applies.start` / `applies.end` are required.
 */
export function validateContractDraft(input: ContractDraftInput): FieldError[] {
  const errors: FieldError[] = [];
  if (!input.code?.trim()) errors.push({ field: "code", message: "Contract code is required" });
  if (!ISO_DATE.test(input.dateValidFrom ?? "")) {
    errors.push({ field: "dateValidFrom", message: "Start date is required" });
  }
  if (!ISO_DATE.test(input.dateValidTo ?? "")) {
    errors.push({ field: "dateValidTo", message: "End date is required" });
  } else if (ISO_DATE.test(input.dateValidFrom ?? "") && input.dateValidTo < input.dateValidFrom) {
    // Backend rule (ContractSerializer): date_valid_to >= date_valid_from.
    errors.push({ field: "dateValidTo", message: "End date cannot be before the start date" });
  }
  return errors;
}

export function contractModelForDraft(input: ContractDraftInput): ContractModel {
  return new ContractModel(
    "",
    input.code.trim(),
    undefined,
    undefined,
    undefined,
    input.dateValidFrom,
    input.dateValidTo
  );
}

/** `date_approved` filter value: a single date or `start||end` range. */
export function approvedDateRange(from?: string, to?: string): string | undefined {
  if (from && to) return `${from}||${to}`;
  return from || to || undefined;
}
