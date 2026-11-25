import type { ZodType } from "zod";

export {
  signInSchema,
  registerSchema,
  verifyEmailSchema,
  resendVerifySchema,
} from "../common/validation/auth";
export {
  HF_LEVELS,
  HF_CARE_TYPES,
  HF_STAFF_ROLES,
  enrollmentRegisterSchema,
  accountClaimSchema,
  createStaffSchema,
  updateStaffSchema,
} from "../common/validation/healthfacility";
export type {
  SignInFormData,
  RegisterFormData,
  VerifyEmailFormData,
} from "../common/validation/auth";
export type {
  EnrollmentRegisterFormData,
  AccountClaimFormData,
  CreateStaffFormData,
  UpdateStaffFormData,
} from "../common/validation/healthfacility";

export type ValidationResult<T> =
  | { success: true; data: T }
  | {
      success: false;
      /** First problem overall — what the JSON API routes return as `error`. */
      message: string;
      /** First problem per top-level field — what form pages show under each input. */
      fieldErrors: Record<string, string | undefined>;
    };

/**
 * Run a zod schema and flatten the failure the way both the API routes
 * (`issues[0].message`) and the form pages (`fieldErrors[field][0]`) consume it.
 */
export function validateWith<T>(
  schema: ZodType<T>,
  input: unknown,
  fallbackMessage = "Invalid payload"
): ValidationResult<T> {
  const parsed = schema.safeParse(input);
  if (parsed.success) return { success: true, data: parsed.data };
  const fieldErrors: Record<string, string | undefined> = {};
  for (const issue of parsed.error.issues) {
    const field = String(issue.path[0] ?? "");
    if (field && fieldErrors[field] === undefined) fieldErrors[field] = issue.message;
  }
  return {
    success: false,
    message: parsed.error.issues[0]?.message ?? fallbackMessage,
    fieldErrors,
  };
}
