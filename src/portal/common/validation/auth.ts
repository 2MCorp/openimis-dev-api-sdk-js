import { z } from "zod";

export const signInSchema = z.object({
  username: z.string().min(1, "User name is required"),
  password: z.string().min(1, "Password is required").min(8, "Password must be 8+ characters"),
});
export type SignInFormData = z.infer<typeof signInSchema>;

export const registerSchema = z.object({
  username: z.string().min(1, "Username is required").max(50),
  email: z.string().email("Valid email is required"),
  password: z.string().min(1, "Password is required").min(8, "Password must be 8+ characters"),
});
export type RegisterFormData = z.infer<typeof registerSchema>;

export const verifyEmailSchema = z.object({
  email: z.string().email("Valid email is required"),
  otp: z
    .string()
    .min(6, "OTP must be 6 digits")
    .max(6, "OTP must be 6 digits")
    .regex(/^\d{6}$/, "OTP must be 6 digits"),
});
export type VerifyEmailFormData = z.infer<typeof verifyEmailSchema>;

export const resendVerifySchema = z.object({
  email: z.string().email("Valid email is required"),
});
