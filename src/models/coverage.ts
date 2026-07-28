export class CoverageModel {
  constructor(
    public id: string,
    public status?: string,
    public policyUuid?: string,
    public policyCode?: string,
    public productName?: string,
    public productUuid?: string,
    public subscriberId?: string,
    public beneficiaryId?: string,
    public familyUuid?: string,
    public periodStart?: string,
    public periodEnd?: string,
    public enrollmentDate?: string,
    public effectiveDate?: string
  ) {}
}
