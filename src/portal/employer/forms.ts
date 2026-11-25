import {
  POLICY_HOLDER_TYPES,
  POLICY_HOLDER_TYPES_REQUIRING_REGISTRATION,
  validatePolicyHolderAccountClaim,
  validatePolicyHolderRegistration,
} from "../../enrollment/enrollment_ops";
import type {
  PolicyHolderAccountClaimInput,
  PolicyHolderRegistrationData,
} from "../../enrollment/enrollment_ops";
import { validatePortalRegistration } from "../../auth/permissions";
import { STAFF_ROLES, validateStaffAccount } from "../../models/staff";
import type { CreateStaffPayload } from "../../models/staff";
import type { FieldError } from "../../utils/field_error";

/**
 * Form parsing for auth / enrollment / staff actions. These only turn form input into
 * typed values; the business rules are the SDK validators. A failure carries the first
 * message per field.
 */
export type FormInput =
  | FormData
  | URLSearchParams
  | Record<string, unknown>
  | { get(name: string): unknown };

export type FieldErrors = Record<string, string | undefined>;
export type ParseResult<T> = { ok: true; data: T } | { ok: false; errors: FieldErrors };

/** String value of a form field (`""` when absent). */
export function formValue(form: FormInput, name: string): string {
  const raw =
    typeof (form as { get?: unknown }).get === "function"
      ? (form as { get(name: string): unknown }).get(name)
      : (form as Record<string, unknown>)[name];
  return raw == null || typeof raw === "object" ? "" : String(raw);
}

/** The listed fields as plain strings — used to echo values back into a failed form. */
export function formValues<K extends string>(form: FormInput, names: readonly K[]): Record<K, string> {
  return Object.fromEntries(names.map((n) => [n, formValue(form, n)])) as Record<K, string>;
}

/** First message per field. */
export function firstErrors(errors: readonly FieldError[]): FieldErrors {
  const out: FieldErrors = {};
  for (const e of errors) if (out[e.field] === undefined) out[e.field] = e.message;
  return out;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const failWith = (errors: FieldError[]): { ok: false; errors: FieldErrors } => ({
  ok: false,
  errors: firstErrors(errors),
});
const blank = (v: string): string | undefined => {
  const t = v.trim();
  return t ? t : undefined;
};

// ── Authentication ──────────────────────────────────────────────────────────────

export function parseSignIn(form: FormInput): ParseResult<{ username: string; password: string }> {
  const username = formValue(form, "username");
  const password = formValue(form, "password");
  const errors: FieldError[] = [];
  if (!username) errors.push({ field: "username", message: "User name is required" });
  if (!password) errors.push({ field: "password", message: "Password is required" });
  return errors.length ? failWith(errors) : { ok: true, data: { username, password } };
}

export function parseRegister(
  form: FormInput
): ParseResult<{ username: string; email: string; password: string }> {
  const data = {
    username: formValue(form, "username"),
    email: formValue(form, "email"),
    password: formValue(form, "password"),
  };
  const errors = validatePortalRegistration(data);
  return errors.length ? failWith(errors) : { ok: true, data };
}

export function parseVerifyEmail(form: FormInput): ParseResult<{ email: string; otp: string }> {
  const email = formValue(form, "email");
  const otp = formValue(form, "otp");
  const errors: FieldError[] = [];
  if (!EMAIL.test(email)) errors.push({ field: "email", message: "Valid email is required" });
  if (!/^\d{6}$/.test(otp)) errors.push({ field: "otp", message: "OTP must be 6 digits" });
  return errors.length ? failWith(errors) : { ok: true, data: { email, otp } };
}

export function parseResendVerify(form: FormInput): ParseResult<{ email: string }> {
  const email = formValue(form, "email");
  return EMAIL.test(email)
    ? { ok: true, data: { email } }
    : failWith([{ field: "email", message: "Valid email is required" }]);
}

export const parseForgotPassword = parseResendVerify;

/** `email` comes from the reset state, not the form. */
export function parseResetVerify(email: string, form: FormInput): ParseResult<{ email: string; otp: string }> {
  const otp = formValue(form, "otp").trim();
  const errors: FieldError[] = [];
  if (!EMAIL.test(email)) errors.push({ field: "email", message: "Valid email is required" });
  if (!/^\d{4,8}$/.test(otp)) errors.push({ field: "otp", message: "Enter the code from your email" });
  return errors.length ? failWith(errors) : { ok: true, data: { email, otp } };
}

export function parseResetConfirm(form: FormInput): ParseResult<{ password: string }> {
  const password = formValue(form, "password");
  const confirm = formValue(form, "confirm");
  const errors = validatePortalRegistration({ username: "x", email: "x@x.xx", password });
  if (password !== confirm) errors.push({ field: "confirm", message: "Passwords do not match" });
  return errors.length ? failWith(errors) : { ok: true, data: { password } };
}

// ── Enrollment ──────────────────────────────────────────────────────────────────

/** Fields echoed back on the registration form (`region_id` only drives the district list). */
export const ENROLLMENT_REGISTER_FIELDS = [
  "policyholder_code",
  "policyholder_name",
  "policyholder_type",
  "registration_number",
  "contact_person",
  "contact_email",
  "contact_phone",
  "address",
  "region_id",
  "location_id",
  "expected_members",
] as const;

export function parseEnrollmentRegister(form: FormInput): ParseResult<PolicyHolderRegistrationData> {
  const expected = formValue(form, "expected_members").trim();
  const data: PolicyHolderRegistrationData = {
    policyholder_code: formValue(form, "policyholder_code"),
    policyholder_name: formValue(form, "policyholder_name"),
    policyholder_type: blank(formValue(form, "policyholder_type")),
    registration_number: blank(formValue(form, "registration_number")),
    contact_person: blank(formValue(form, "contact_person")),
    contact_email: blank(formValue(form, "contact_email")),
    contact_phone: blank(formValue(form, "contact_phone")),
    address: blank(formValue(form, "address")),
    location_id: blank(formValue(form, "location_id")),
    expected_members: expected ? Number(expected) : undefined,
  };
  const errors = validatePolicyHolderRegistration(data);
  return errors.length ? failWith(errors) : { ok: true, data };
}

export const ACCOUNT_CLAIM_FIELDS = [
  "policyholder_code",
  "contact_name",
  "contact_email",
  "notes",
] as const;

export function parseAccountClaim(form: FormInput): ParseResult<PolicyHolderAccountClaimInput> {
  const data: PolicyHolderAccountClaimInput = {
    policyholder_code: formValue(form, "policyholder_code"),
    contact_name: blank(formValue(form, "contact_name")),
    contact_email: blank(formValue(form, "contact_email")),
    notes: blank(formValue(form, "notes")),
  };
  const errors = validatePolicyHolderAccountClaim(data);
  return errors.length ? failWith(errors) : { ok: true, data };
}

export const POLICY_HOLDER_TYPE_OPTIONS: string[] = [...POLICY_HOLDER_TYPES];
export const TYPES_REQUIRING_REGISTRATION: string[] = [...POLICY_HOLDER_TYPES_REQUIRING_REGISTRATION];

// ── Staff ───────────────────────────────────────────────────────────────────────

export const STAFF_ROLE_OPTIONS: string[] = [...STAFF_ROLES];

export function parseCreateStaff(form: FormInput): ParseResult<CreateStaffPayload> {
  const data: CreateStaffPayload = {
    username: formValue(form, "username"),
    email: formValue(form, "email"),
    password: formValue(form, "password"),
    other_names: blank(formValue(form, "other_names")),
    last_name: blank(formValue(form, "last_name")),
    role: formValue(form, "role").trim() || "STAFF",
  };
  const errors = validateStaffAccount(data);
  return errors.length ? failWith(errors) : { ok: true, data };
}

export function parseUpdateStaff(
  form: FormInput
): ParseResult<{ role: string; active: boolean }> {
  const role = formValue(form, "role");
  const flag = formValue(form, "active").trim().toLowerCase();
  if (!(STAFF_ROLES as readonly string[]).includes(role)) {
    return failWith([{ field: "role", message: "Select a valid role" }]);
  }
  return { ok: true, data: { role, active: flag === "true" || flag === "on" || flag === "1" } };
}
