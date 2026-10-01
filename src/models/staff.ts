/** Policy-holder portal staff (FHIR OrganizationAffiliation). */
export class StaffModel {
  constructor(
    public id: string,
    public uuid: string,
    public active?: boolean,
    public username?: string,
    /** Full name, falling back to the username. */
    public displayName?: string,
    /** `ADMIN` (ph_admin group) or `STAFF` (ph_staff). */
    public role?: string,
    public email?: string,
    public phone?: string
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

/** Portal staff roles → Django groups `ph_admin`/`ph_staff` (or `hf_admin`/`hf_staff`). */
export const STAFF_ROLES = ["ADMIN", "STAFF"] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

export type StaffFieldError = { field: string; message: string };

/**
 * Same checks as `create_policy_holder_staff_user` / `create_hf_staff_user`
 * (developer_api/api_auth/services/portal_user.py); uniqueness is checked server-side.
 */
export function validateStaffAccount(payload: CreateStaffPayload): StaffFieldError[] {
  const errors: StaffFieldError[] = [];
  if (!payload.username?.trim()) errors.push({ field: "username", message: "Username is required" });
  if (!payload.email?.trim()) errors.push({ field: "email", message: "Email is required" });
  if (!payload.password) errors.push({ field: "password", message: "Password is required" });
  else if (payload.password.length < 8) {
    errors.push({ field: "password", message: "Password must be at least 8 characters" });
  }
  if (payload.role && !(STAFF_ROLES as readonly string[]).includes(payload.role)) {
    errors.push({ field: "role", message: "Invalid staff role" });
  }
  return errors;
}
