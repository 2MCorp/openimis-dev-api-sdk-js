import { PaymentStatus, classifyPaymentStatus } from "../formalsector/payment_status";

export class PaymentDetailModel {
  constructor(
    public productCode?: string,
    public insuranceNumber?: string,
    public amount?: number,
    public policyStage?: string
  ) {}
}

/** Employee PaymentNotice converter. */
export class PaymentNoticeModel {
  constructor(
    public id: string,
    public status?: string,
    public uuid?: string,
    public paymentId?: string,
    public transactionNo?: string,
    public created?: string,
    public paymentDate?: string,
    public amount?: number,
    public currency?: string,
    public officerCode?: string,
    public details: PaymentDetailModel[] = []
  ) {}
}

export class PaymentReconciliationDetailModel {
  constructor(
    public id?: string,
    public policyStage?: string,
    public amount?: number,
    public payeeInsuranceNumber?: string
  ) {}
}

/** Formal-sector PaymentReconciliation converter. */
export class PaymentReconciliationModel {
  constructor(
    public id: string,
    public status?: string,
    public created?: string,
    public paymentDate?: string,
    public amount?: number,
    public currency?: string,
    public transactionNo?: string,
    public receiptNo?: string,
    public disposition?: string,
    public contractCode?: string,
    public details: PaymentReconciliationDetailModel[] = []
  ) {}

  /** Portal bucket for `status` (paid / pending / failed). */
  get statusKey(): PaymentStatus {
    return classifyPaymentStatus(this.status);
  }
}
