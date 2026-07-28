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
    public amendment?: string
  ) {}
}
