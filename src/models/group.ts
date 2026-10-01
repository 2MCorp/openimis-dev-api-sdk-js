export class GroupMemberModel {
  constructor(
    public chfId: string,
    public display?: string,
    public insureeUuid?: string,
    /** Heads the household (`patient-is-head` extension); undefined when not sent. */
    public isHead?: boolean
  ) {}
}

export class FamilyGroupModel {
  constructor(
    public id: string,
    public name: string,
    public uuid?: string,
    public headChfId?: string,
    public active?: boolean,
    public quantity?: number,
    public members: GroupMemberModel[] = [],
    public povertyStatus?: boolean,
    public familyType?: string,
    public addressText?: string,
    public locationUuid?: string
  ) {}
}

export class EmployeeGroupModel {
  constructor(
    public id: string,
    public type: string,
    public uuid?: string,
    public membership = "definitional",
    public members: GroupMemberModel[] = []
  ) {}
}
