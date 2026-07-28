export class HealthFacilityModel {
  constructor(
    public id: string,
    public code: string,
    public name: string,
    public uuid?: string,
    public status?: "active" | "inactive" | "unknown" | string,
    public level?: "health-center" | "dispensary" | "hospital" | string,
    public phone?: string,
    public fax?: string,
    public email?: string,
    public address?: string,
    public districtName?: string,
    public stateName?: string,
    public parentLocationId?: string,
    public parentLocationName?: string,
    public subLevelId?: string,
    public subLevelLabel?: string,
    public careType?: "inpatient" | "outpatient" | "both" | string,
    public qualityAssurance?: "qualified" | "unqualified" | string,
    public accreditation?: "accredited" | "unaccredited" | string,
    public contractStart?: string,
    public contractEnd?: string,
    public legalFormCode?: string
  ) {}
}

export class HealthFacilityOrganizationModel extends HealthFacilityModel {
  constructor(
    id: string,
    code: string,
    name: string,
    public contacts: { family?: string; given?: string[] }[] = [],
    uuid?: string,
    status?: string,
    level?: string,
    phone?: string,
    fax?: string,
    email?: string,
    address?: string,
    districtName?: string,
    stateName?: string,
    parentLocationId?: string,
    careType?: string,
    legalFormCode?: string
  ) {
    super(
      id,
      code,
      name,
      uuid,
      status,
      level,
      phone,
      fax,
      email,
      address,
      districtName,
      stateName,
      parentLocationId,
      undefined,
      undefined,
      undefined,
      careType,
      undefined,
      undefined,
      undefined,
      undefined,
      legalFormCode
    );
  }
}
