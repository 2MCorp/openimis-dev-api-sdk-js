export class ClaimChargeItemModel {
  constructor(
    public id: string,
    public code: string,
    public name?: string,
    public status?: string,
    public patientChfId?: string,
    public claimUuid?: string,
    public quantity?: number,
    public unitPrice?: number,
    public currency?: string,
    public enteredDate?: string,
    public kind: "item" | "service" | string = "item"
  ) {}
}
