/// <reference types="fhir" />

import { FhirListParams } from "../healthfacility/types";

export const PH_BASE_PATH = "/policy-holder-dev-api";

export {
  FhirListParams,
  buildQuery,
  asFhirBundle,
  asFhirResource,
} from "../healthfacility/types";

export class EmployeeListFilters extends FhirListParams {
  constructor(
    pageOffset?: number,
    count?: number,
    public chfId?: string,
    public lastName?: string,
    public otherNames?: string
  ) {
    super(pageOffset, count);
  }

  override toQuery(): Record<string, string | number | boolean | undefined> {
    return {
      ...super.toQuery(),
      _chfid: this.chfId,
      _last_name: this.lastName,
      _other_names: this.otherNames,
    };
  }
}

export class ContractListFilters extends FhirListParams {
  constructor(
    pageOffset?: number,
    count?: number,
    public code?: string,
    /** Single date or `start||end` range. */
    public dateApproved?: string
  ) {
    super(pageOffset, count);
  }

  override toQuery(): Record<string, string | number | boolean | undefined> {
    return {
      ...super.toQuery(),
      code: this.code,
      date_approved: this.dateApproved,
    };
  }
}

export class InsurancePlanListFilters extends FhirListParams {
  constructor(
    pageOffset?: number,
    count?: number,
    public code?: string
  ) {
    super(pageOffset, count);
  }

  override toQuery(): Record<string, string | number | boolean | undefined> {
    return {
      ...super.toQuery(),
      code: this.code,
    };
  }
}

export class EmployeeClaimListFilters extends FhirListParams {
  constructor(
    pageOffset?: number,
    count?: number,
    /** Required: PolicyHolderInsuree UUID. */
    public identifier?: string
  ) {
    super(pageOffset, count);
  }

  override toQuery(): Record<string, string | number | boolean | undefined> {
    return {
      ...super.toQuery(),
      identifier: this.identifier,
    };
  }
}

export class EmployeeBinaryUploadQuery {
  constructor(
    public policyHolderContributionPlanId?: string,
    public contributionPlanCode?: string,
    public contributionPlanName?: string
  ) {}

  toQuery(): Record<string, string | number | boolean | undefined> {
    return {
      policy_holder_contribution_plan_id: this.policyHolderContributionPlanId,
      PolicyHolderContributionPlanID: this.policyHolderContributionPlanId,
      contribution_plan_code: this.contributionPlanCode,
      contribution_plan_name: this.contributionPlanName,
    };
  }
}
