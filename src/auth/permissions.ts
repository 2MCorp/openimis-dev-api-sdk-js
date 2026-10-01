/**
 * Portal permission catalog — mirrors `HF_PORTAL_PERMISSIONS` / `PH_PORTAL_PERMISSIONS`
 * in `developer_api.api_auth.models.portal_profile`. `/user/` returns these as
 * `api_auth.<codename>` alongside the rest of the Django permission catalog.
 */
export const PERMISSION_APP_LABEL = "api_auth";

export const HF_PORTAL_PERMISSIONS = {
  accessPortal: "api_auth.access_hf_portal",
  submitEnrollment: "api_auth.submit_hf_enrollment",
  submitAccountClaim: "api_auth.submit_hf_account_claim",
  viewDashboard: "api_auth.view_dashboard",
  viewPatients: "api_auth.view_patients",
  managePatients: "api_auth.manage_patients",
  viewClaims: "api_auth.view_claims",
  addClaims: "api_auth.add_claims",
  changeClaims: "api_auth.change_claims",
  submitClaims: "api_auth.submit_claims",
  viewEncounters: "api_auth.view_encounters",
  addEncounters: "api_auth.add_encounters",
  changeEncounters: "api_auth.change_encounters",
  submitEncounters: "api_auth.submit_encounters",
  viewPreauthorizations: "api_auth.view_preauthorizations",
  addPreauthorizations: "api_auth.add_preauthorizations",
  changePreauthorizations: "api_auth.change_preauthorizations",
  manageStaff: "api_auth.manage_hf_staff",
  viewProfile: "api_auth.view_profile",
} as const;

export const PH_PORTAL_PERMISSIONS = {
  accessPortal: "api_auth.access_ph_portal",
  submitEnrollment: "api_auth.submit_ph_enrollment",
  submitAccountClaim: "api_auth.submit_ph_account_claim",
  viewDashboard: "api_auth.view_ph_dashboard",
  viewEmployees: "api_auth.view_employees",
  manageEmployees: "api_auth.manage_employees",
  viewContracts: "api_auth.view_contracts",
  manageContracts: "api_auth.manage_contracts",
  viewPayments: "api_auth.view_payments",
  managePayments: "api_auth.manage_payments",
  viewPlans: "api_auth.view_plans",
  managePlans: "api_auth.manage_plans",
  viewEmployeeClaims: "api_auth.view_employee_claims",
  manageEmployeeClaims: "api_auth.manage_employee_claims",
  manageStaff: "api_auth.manage_ph_staff",
  viewProfile: "api_auth.view_ph_profile",
} as const;

export type HfPortalPermission =
  (typeof HF_PORTAL_PERMISSIONS)[keyof typeof HF_PORTAL_PERMISSIONS];
export type PhPortalPermission =
  (typeof PH_PORTAL_PERMISSIONS)[keyof typeof PH_PORTAL_PERMISSIONS];

type PermissionHolder = { permissions?: readonly string[] | null } | null | undefined;

/** `view_employees` → `api_auth.view_employees`; already-qualified names pass through. */
export function normalizePermission(permission: string): string {
  const trimmed = permission.trim();
  if (!trimmed) return trimmed;
  return trimmed.includes(".") ? trimmed : `${PERMISSION_APP_LABEL}.${trimmed}`;
}

function codename(permission: string): string {
  const full = normalizePermission(permission);
  return full.slice(full.lastIndexOf(".") + 1);
}

export function hasPermission(user: PermissionHolder, permission: string): boolean {
  if (!user?.permissions?.length) return false;
  const want = normalizePermission(permission);
  const wantShort = codename(want);
  return user.permissions.some((p) => {
    const full = normalizePermission(p);
    return full === want || codename(full) === wantShort;
  });
}

export function hasAnyPermission(user: PermissionHolder, permissions: readonly string[]): boolean {
  return permissions.some((p) => hasPermission(user, p));
}

/**
 * Keep only the permissions of one portal catalog (normalised to `api_auth.*`).
 * The full Django catalog is too large to store in a session cookie.
 */
export function slimPermissions(
  permissions: readonly string[],
  catalog: Record<string, string>
): string[] {
  const allowed = new Set(Object.values(catalog).map(codename));
  const kept = new Set<string>();
  for (const raw of permissions) {
    const short = codename(raw);
    if (allowed.has(short)) kept.add(`${PERMISSION_APP_LABEL}.${short}`);
  }
  return [...kept];
}

export type PortalFieldError = { field: string; message: string };

/** Portal self-registration rules (`register_portal_user`): all fields, password ≥ 8. */
export function validatePortalRegistration(input: {
  username?: string;
  email?: string;
  password?: string;
}): PortalFieldError[] {
  const errors: PortalFieldError[] = [];
  if (!input.username?.trim()) errors.push({ field: "username", message: "Username is required" });
  const email = input.email?.trim() ?? "";
  if (!email) errors.push({ field: "email", message: "Email is required" });
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push({ field: "email", message: "Valid email is required" });
  }
  if (!input.password) errors.push({ field: "password", message: "Password is required" });
  else if (input.password.length < 8) {
    errors.push({ field: "password", message: "Password must be at least 8 characters" });
  }
  return errors;
}
