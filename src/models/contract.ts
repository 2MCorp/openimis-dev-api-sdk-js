import {
  ContractState,
  ContractStateGroup,
  contractStateGroup,
  isContractEditable,
  normalizeContractState,
} from "../formalsector/contract_states";

export class ContractSubjectModel {
  constructor(
    public chfId: string,
    public display?: string
  ) {}
}

export class ContractTermModel {
  constructor(
    public insurancePlanId?: string,
    public insurancePlanName?: string,
    public amountDue?: number,
    public currency?: string
  ) {}
}

export class ContractModel {
  constructor(
    public id: string,
    public code: string,
    public status?: string,
    public issued?: string,
    public paymentDue?: string,
    public dateValidFrom?: string,
    public dateValidTo?: string,
    public policyHolderId?: string,
    public policyHolderName?: string,
    public subjects: ContractSubjectModel[] = [],
    public terms: ContractTermModel[] = [],
    public amountNotified?: number,
    public amountRectified?: number,
    public paymentReference?: string,
    public amendment?: string,
    /** Contract-level amount due (`amountDue` extension). */
    public amountDue?: number,
    /** Currency of the contract amounts (backend `core.currency`). */
    public currency?: string
  ) {}

  get state(): ContractState | undefined {
    return normalizeContractState(this.status);
  }

  get stateGroup(): ContractStateGroup | undefined {
    return contractStateGroup(this.status);
  }

  get editable(): boolean {
    return isContractEditable(this.status);
  }

  /** Health packages on the contract, once each (the backend emits one term per member). */
  get insurancePlans(): ContractTermModel[] {
    const seen = new Set<string>();
    return this.terms.filter((term) => {
      const key = term.insurancePlanId ?? term.insurancePlanName ?? "";
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  /**
   * The amount that applies in the current state — same rule as the backend
   * `Contract.amount` property: notified while draft / request-for-information,
   * rectified during offer / negotiable / counter, due afterwards.
   */
  get amount(): number | undefined {
    switch (this.state) {
      case "request-for-information":
      case "draft":
        return this.amountNotified;
      case "offer":
      case "negotiable":
      case "counter":
        return this.amountRectified;
      default:
        return this.amountDue;
    }
  }
}
