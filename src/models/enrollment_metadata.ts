/**
 * Enrollment location (region, district, municipality, etc.)
 */
export class EnrollmentLocation {
  constructor(
    public readonly id: number,
    public readonly uuid: string,
    public readonly code: string,
    public readonly name: string,
    public readonly type: string,
    public readonly parentId: number | null,
  ) {}

  static fromJSON(json: Record<string, unknown>): EnrollmentLocation {
    return new EnrollmentLocation(
      Number(json.id ?? 0),
      String(json.uuid ?? ""),
      String(json.code ?? ""),
      String(json.name ?? ""),
      String(json.type ?? ""),
      json.parent_id != null ? Number(json.parent_id) : null,
    );
  }

  toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      uuid: this.uuid,
      code: this.code,
      name: this.name,
      type: this.type,
      ...(this.parentId != null && { parent_id: this.parentId }),
    };
  }
}

/**
 * Health facility legal form (NGO, Private, Government, etc.)
 */
export class EnrollmentLegalForm {
  constructor(
    public readonly code: string,
    public readonly name: string,
    public readonly sortOrder: number | null,
  ) {}

  static fromJSON(json: Record<string, unknown>): EnrollmentLegalForm {
    return new EnrollmentLegalForm(
      String(json.code ?? ""),
      String(json.name ?? ""),
      json.sort_order != null ? Number(json.sort_order) : null,
    );
  }

  toJSON(): Record<string, unknown> {
    return {
      code: this.code,
      name: this.name,
      ...(this.sortOrder != null && { sort_order: this.sortOrder }),
    };
  }
}
