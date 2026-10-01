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

/** Key identifying one health package (bundle) across duplicate plan rows. */
export function insurancePlanPackageKey(plan: EmployeeInsurancePlanModel): string {
  return (
    plan.contributionPlanBundleUuid ||
    plan.contributionPlanBundleCode ||
    plan.policyHolderContributionPlanId ||
    plan.name
  );
}

/**
 * The backend can return one InsurancePlan per bundle detail; keep one entry per
 * package (the one listing the most contribution plans).
 */
export function dedupeInsurancePlans(
  plans: readonly EmployeeInsurancePlanModel[]
): EmployeeInsurancePlanModel[] {
  const byKey = new Map<string, EmployeeInsurancePlanModel>();
  for (const plan of plans) {
    const key = insurancePlanPackageKey(plan);
    const existing = byKey.get(key);
    if (!existing || plan.plans.length > existing.plans.length) byKey.set(key, plan);
  }
  return [...byKey.values()];
}
