export class InsurancePlanDetailModel {
  constructor(
    public detailId?: string,
    public contributionPlanId?: string,
    public code?: string,
    public name?: string
  ) {}
}

/** Policy-holder contribution plan (EmployeeInsurancePlan converter). */
export class EmployeeInsurancePlanModel {
  constructor(
    public id: string,
    public name: string,
    public policyHolderContributionPlanId?: string,
    public contributionPlanBundleUuid?: string,
    public contributionPlanBundleId?: string,
    public contributionPlanBundleCode?: string,
    public plans: InsurancePlanDetailModel[] = []
  ) {}
}
