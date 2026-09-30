/** Relative to HttpClient baseURL (`…/developer_api`). */
export const ENROLLMENT_BASE_PATH = "/enrollment";

export type HealthFacilityRegistrationPayload = {
  facility_data: Record<string, unknown>;
  metadata?: Record<string, unknown> | null;
  notes?: string;
  submitted_by_type?: string | null;
  self_enrollemnt_type?: string | null;
};

export type HealthFacilityAccountClaimPayload = {
  facility_code?: string;
  claim_data?: Record<string, unknown>;
  notes?: string;
  contact_email?: string;
  contact_phone?: string;
  auto_submit?: boolean;
  [key: string]: unknown;
};

export type PolicyHolderRegistrationPayload = {
  policyholder_data: Record<string, unknown>;
  metadata?: Record<string, unknown> | null;
  notes?: string;
  submitted_by_type?: string | null;
  self_enrollemnt_type?: string | null;
};

export type PolicyHolderAccountClaimPayload = {
  policyholder_code?: string;
  claim_data?: Record<string, unknown>;
  notes?: string;
  contact_email?: string;
  contact_phone?: string;
  auto_submit?: boolean;
  [key: string]: unknown;
};

export class EnrollmentRecord {
  constructor(
    public readonly uuid: string,
    public readonly status: string,
    public readonly raw: Record<string, unknown>
  ) {}

  static fromJSON(data: Record<string, unknown>): EnrollmentRecord {
    // service_to_response wraps: { success, message, data: { uuid, status } }
    const nested =
      data.data && typeof data.data === "object" && !Array.isArray(data.data)
        ? (data.data as Record<string, unknown>)
        : null;
    const source = nested ?? data;
    return new EnrollmentRecord(
      String(source.uuid ?? source.id ?? data.uuid ?? data.id ?? ""),
      String(source.status ?? data.status ?? ""),
      data
    );
  }
}

export class EnrollmentListResult {
  constructor(
    public readonly results: EnrollmentRecord[],
    public readonly raw: Record<string, unknown>
  ) {}

  static fromJSON(data: unknown): EnrollmentListResult {
    if (Array.isArray(data)) {
      const results = data.map((item) =>
        EnrollmentRecord.fromJSON(item as Record<string, unknown>)
      );
      return new EnrollmentListResult(results, { results: data });
    }
    const record =
      data && typeof data === "object" ? (data as Record<string, unknown>) : {};
    const items = Array.isArray(record.results)
      ? record.results
      : Array.isArray(record.data)
        ? record.data
        : [];
    return new EnrollmentListResult(
      items.map((item) =>
        EnrollmentRecord.fromJSON(item as Record<string, unknown>)
      ),
      record
    );
  }
}

export class EnrollmentActionResult {
  constructor(
    public readonly success: boolean,
    public readonly message: string,
    public readonly data: unknown,
    public readonly raw: Record<string, unknown>
  ) {}

  static fromJSON(data: unknown): EnrollmentActionResult {
    const record =
      data && typeof data === "object" ? (data as Record<string, unknown>) : {};
    return new EnrollmentActionResult(
      typeof record.success === "boolean" ? record.success : true,
      String(record.message ?? record.detail ?? ""),
      record.data ?? record,
      record
    );
  }
}
