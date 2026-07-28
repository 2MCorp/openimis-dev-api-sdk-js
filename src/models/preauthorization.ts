export class DiagnosisCode {
  constructor(
    public code: string,
    public name?: string
  ) {}
}

export class PreauthorizationModel {
  constructor(
    public id: string,
    public status: "Entered" | "Approved" | "Rejected" | "active" | string,
    public patientChfId: string,
    public uuid?: string,
    public created?: string,
    public patientName?: string,
    public hfFromId?: string,
    public hfFromDisplay?: string,
    public hfToId?: string,
    public hfToDisplay?: string,
    public primaryDiagnosis?: DiagnosisCode,
    public secondaryDiagnosis?: DiagnosisCode,
    public tertiaryDiagnosis?: DiagnosisCode,
    public quaternaryDiagnosis?: DiagnosisCode,
    public service?: DiagnosisCode,
    public item?: DiagnosisCode,
    public rejectionReason?: string,
    public explanation?: string
  ) {}
}
