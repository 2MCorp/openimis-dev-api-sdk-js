/**
 * Result of bulk encounter/claim CSV upload.
 */
export class BulkEncounterResult {
  constructor(
    public readonly message: string,
    public readonly totalRows: number,
    public readonly successful: number,
    public readonly failed: number,
    public readonly results: BulkEncounterRow[],
  ) {}

  static fromJSON(json: Record<string, unknown>): BulkEncounterResult {
    const results = Array.isArray(json.results)
      ? json.results.map((r: unknown) =>
          BulkEncounterRow.fromJSON(r as Record<string, unknown>),
        )
      : [];

    return new BulkEncounterResult(
      String(json.message ?? ""),
      Number(json.total_rows ?? 0),
      Number(json.successful ?? 0),
      Number(json.failed ?? 0),
      results,
    );
  }

  toJSON(): Record<string, unknown> {
    return {
      message: this.message,
      total_rows: this.totalRows,
      successful: this.successful,
      failed: this.failed,
      results: this.results.map((r) => r.toJSON()),
    };
  }
}

/**
 * Single row result from bulk upload.
 */
export class BulkEncounterRow {
  constructor(
    public readonly row: number,
    public readonly success: boolean,
    public readonly message: string,
    public readonly claimId?: string | number,
  ) {}

  static fromJSON(json: Record<string, unknown>): BulkEncounterRow {
    return new BulkEncounterRow(
      Number(json.row ?? 0),
      Boolean(json.success),
      String(json.message ?? ""),
      json.claim_id != null ? String(json.claim_id) : undefined,
    );
  }

  toJSON(): Record<string, unknown> {
    return {
      row: this.row,
      success: this.success,
      message: this.message,
      ...(this.claimId != null && { claim_id: this.claimId }),
    };
  }
}
