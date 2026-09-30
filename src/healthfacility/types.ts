/// <reference types="fhir" />

export const HF_BASE_PATH = "/health-facility-dev-api";

export class FhirListParams {
  constructor(
    public pageOffset?: number,
    public count?: number
  ) {}

  toQuery(): Record<string, string | number | boolean | undefined> {
    // OpenIMIS FHIR uses PageNumberPagination with page_query_param="page-offset"
    // (1-based page number). Values < 1 are invalid and must be omitted.
    return {
      "page-offset":
        this.pageOffset != null && this.pageOffset >= 1
          ? this.pageOffset
          : undefined,
      _count: this.count,
    };
  }
}

export class ClaimListFilters extends FhirListParams {
  constructor(
    pageOffset?: number,
    count?: number,
    public identifier?: string,
    /** Inclusive start date (`YYYY-MM-DD`). Sent as ``dateFrom`` (``refDate`` kept for compat). */
    public refDate?: string,
    public patient?: string,
    public patientChfid?: string,
    public status?:
      | "entered"
      | "rejected"
      | "checked"
      | "processed"
      | "valuated"
      | string,
    public contained?: boolean,
    /** Inclusive end date (`YYYY-MM-DD`). */
    public dateTo?: string
  ) {
    super(pageOffset, count);
  }

  override toQuery(): Record<string, string | number | boolean | undefined> {
    return {
      ...super.toQuery(),
      identifier: this.identifier,
      dateFrom: this.refDate,
      refDate: this.refDate,
      dateTo: this.dateTo,
      patient: this.patient,
      patientChfid: this.patientChfid,
      status: this.status,
      contained: this.contained ? "true" : undefined,
    };
  }
}

export class EncounterListFilters extends ClaimListFilters {
  constructor(
    pageOffset?: number,
    count?: number,
    identifier?: string,
    refDate?: string,
    patient?: string,
    patientChfid?: string,
    status?: string,
    contained?: boolean,
    public primaryDiagnosisCode?: string,
    dateTo?: string
  ) {
    super(
      pageOffset,
      count,
      identifier,
      refDate,
      patient,
      patientChfid,
      status,
      contained,
      dateTo
    );
  }

  override toQuery(): Record<string, string | number | boolean | undefined> {
    return {
      ...super.toQuery(),
      primaryDiagnosisCode: this.primaryDiagnosisCode,
    };
  }
}

export class PreauthorizationListFilters extends FhirListParams {
  constructor(
    pageOffset?: number,
    count?: number,
    public identifier?: string,
    public orderBy = "-validity_from",
    public patient?: string,
    public patientCHFID?: string,
    public refDate?: string,
    public status?: "entered" | "approved" | "rejected" | string,
    public contained?: boolean,
    public dateTo?: string
  ) {
    super(pageOffset, count);
  }

  override toQuery(): Record<string, string | number | boolean | undefined> {
    return {
      ...super.toQuery(),
      identifier: this.identifier,
      order_by: this.orderBy,
      patient: this.patient,
      patientCHFID: this.patientCHFID,
      dateFrom: this.refDate,
      refDate: this.refDate,
      dateTo: this.dateTo,
      status: this.status,
      contained: this.contained ? "true" : undefined,
    };
  }
}

export class ClaimLineListFilters extends FhirListParams {
  constructor(
    pageOffset?: number,
    count?: number,
    public claimIdentifier?: string
  ) {
    super(pageOffset, count);
  }

  override toQuery(): Record<string, string | number | boolean | undefined> {
    return {
      ...super.toQuery(),
      claim_identifier: this.claimIdentifier,
    };
  }
}

export class PatientReferenceListFilters extends FhirListParams {
  constructor(
    pageOffset?: number,
    count?: number,
    public chfid?: string,
    public startDate?: string,
    public endDate?: string,
    public include: ("claim" | "encounter" | "preauthorization" | string)[] = []
  ) {
    super(pageOffset, count);
  }

  override toQuery(): Record<string, string | number | boolean | undefined> {
    return {
      ...super.toQuery(),
      chfid: this.chfid,
      start_date: this.startDate,
      end_date: this.endDate,
      // multi include is appended separately in buildQuery
    };
  }
}

export class SubmitOperationResponse {
  constructor(
    public readonly message: string,
    public readonly data: unknown
  ) {}

  static fromJSON(payload: Record<string, unknown>): SubmitOperationResponse {
    return new SubmitOperationResponse(
      String(payload.message ?? ""),
      payload.data
    );
  }
}

export function buildQuery(
  params: Record<string, string | number | boolean | undefined | string[]>
): string {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === "") {
      continue;
    }
    if (Array.isArray(value)) {
      for (const item of value) {
        search.append(key, item);
      }
      continue;
    }
    search.set(key, String(value));
  }

  const query = search.toString();
  return query ? `?${query}` : "";
}

export function asFhirBundle(data: unknown): fhir4.Bundle {
  return data as fhir4.Bundle;
}

export function asFhirResource<T extends fhir4.FhirResource>(data: unknown): T {
  return data as T;
}
