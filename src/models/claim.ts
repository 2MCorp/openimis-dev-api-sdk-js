import type { ClaimStatusCode, ClaimVisitTypeCode } from "../fhir_converter/constants";

export class ClaimDiagnosisModel {
  constructor(
    public sequence: number,
    public code: string,
    public display?: string
  ) {}
}

export class ClaimItemModel {
  constructor(
    public sequence: number,
    public code: string,
    public category: "item" | "service" | string,
    public quantity?: number,
    public unitPrice?: number,
    public currency?: string,
    public reference?: string
  ) {}
}

export class ClaimAttachmentModel {
  constructor(
    public id?: string,
    public title?: string,
    public filename?: string,
    public mime?: string,
    public creation?: string,
    public data?: string,
    public kind?: "URL" | "FILE" | string,
    public url?: string
  ) {}
}

export class ClaimModel {
  constructor(
    public id: string,
    public code: string,
    public status: ClaimStatusCode | string,
    public patientChfId: string,
    public created?: string,
    public uuid?: string,
    public providerId?: string,
    public entererCode?: string,
    public visitType?: ClaimVisitTypeCode | string,
    public dateFrom?: string,
    public dateTo?: string,
    public total?: number,
    public currency?: string,
    public guaranteeId?: string,
    public explanation?: string,
    public coverageId?: string,
    public diagnoses: ClaimDiagnosisModel[] = [],
    public items: ClaimItemModel[] = [],
    public attachments: ClaimAttachmentModel[] = []
  ) {}
}
