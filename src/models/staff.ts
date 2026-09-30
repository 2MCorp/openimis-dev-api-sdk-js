export class StaffModel {
  constructor(
    public id: string,
    public uuid: string,
    public active?: boolean
  ) {}
}

/** Health-facility portal staff (FHIR PractitionerRole). */
export class HfStaffModel {
  constructor(
    public id: string,
    public uuid: string,
    public active?: boolean,
    public username?: string,
    public displayName?: string,
    public role?: string,
    public email?: string,
    public phone?: string,
    public organizationId?: string
  ) {}
}

export type CreateStaffPayload = {
  username: string;
  email: string;
  password: string;
  other_names?: string;
  last_name?: string;
  role?: string;
};

export type UpdateStaffPayload = {
  /** Prefer `is_active`; `active` is accepted by the API as an alias. */
  is_active?: boolean;
  active?: boolean;
  role?: string;
};
