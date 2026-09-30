export type PatientContact = {
  lastName?: string;
  otherNames?: string;
  relationshipId?: string;
  relationshipDisplay?: string;
  phone?: string;
  email?: string;
  gender?: string;
};

export class PatientModel {
  constructor(
    public id: string,
    public chfId: string,
    public lastName: string,
    public otherNames: string,
    public uuid?: string,
    public birthDate?: string,
    public gender?: "male" | "female" | "other" | "unknown" | string,
    public maritalStatus?: "M" | "S" | "D" | "W" | "N" | string,
    public phone?: string,
    public email?: string,
    public isHead = false,
    public cardIssued = false,
    public educationId?: string,
    public educationDisplay?: string,
    public professionId?: string,
    public professionDisplay?: string,
    public passport?: string,
    public identificationTypeCode?: string,
    public familyUuid?: string,
    public relationshipId?: string,
    public relationshipDisplay?: string,
    public healthFacilityId?: string,
    public currentAddress?: string,
    public locationUuid?: string,
    public state?: string,
    public district?: string,
    public municipality?: string,
    public city?: string,
    public addressUse?: "temp" | "home" | string,
    public photoUrl?: string,
    public photoTitle?: string,
    public photoContentType?: string,
    public photoCreation?: string,
    public photoData?: string,
    public contacts: PatientContact[] = []
  ) {}

  get fullName(): string {
    return `${this.otherNames} ${this.lastName}`.trim();
  }
}
