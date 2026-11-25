import { z } from "zod";

import { HF_CARE_TYPES, HF_LEVELS, HF_STAFF_ROLES } from "./hf_options";

export { HF_CARE_TYPES, HF_LEVELS, HF_STAFF_ROLES };

const hfLevelValues = HF_LEVELS.map((l) => l.value) as [string, ...string[]];
const hfCareTypeValues = HF_CARE_TYPES.map((c) => c.value) as [string, ...string[]];
const hfStaffRoleValues = HF_STAFF_ROLES.map((r) => r.value) as [string, ...string[]];

export const enrollmentRegisterSchema = z.object({
  name: z.string().min(1, "Facility name is required"),
  legal_form_id: z.string().optional(),
  level: z.enum(hfLevelValues, { message: "Select a valid facility level" }),
  location_id: z.string().min(1, "Location is required"),
  care_type: z.enum(hfCareTypeValues, { message: "Select a valid care type" }),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
});
export type EnrollmentRegisterFormData = z.infer<typeof enrollmentRegisterSchema>;

export const accountClaimSchema = z.object({
  facility_code: z.string().min(1, "Facility code is required"),
  notes: z.string().optional(),
});
export type AccountClaimFormData = z.infer<typeof accountClaimSchema>;

/** Checkbox / form-data boolean: `true`, `"true"`, `"on"`, `"1"` are truthy. */
export const formBoolean = z.union([z.boolean(), z.string()]).transform((v) => {
  if (typeof v === "boolean") return v;
  const normalized = v.trim().toLowerCase();
  return normalized === "true" || normalized === "on" || normalized === "1";
});

export const createStaffSchema = z.object({
  username: z.string().min(1, "Username is required"),
  email: z.string().email("Valid email is required"),
  password: z.string().min(8, "Password must be 8+ characters"),
  other_names: z.string().optional(),
  last_name: z.string().optional(),
  role: z.enum(hfStaffRoleValues, { message: "Select a valid role" }).default("STAFF"),
});
export type CreateStaffFormData = z.infer<typeof createStaffSchema>;

export const updateStaffSchema = z.object({
  role: z.enum(hfStaffRoleValues, { message: "Select a valid role" }),
  active: formBoolean,
});
export type UpdateStaffFormData = z.infer<typeof updateStaffSchema>;
