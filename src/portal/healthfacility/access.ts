import type { HfSessionUser } from "./types";
import { canAccessPath } from "./permissions";

/** `/verify-email` with the address pre-filled when known. */
export function verifyEmailPath(email: string | undefined | null): string {
  const encoded = encodeURIComponent(email || "");
  return encoded ? `/verify-email?email=${encoded}` : "/verify-email";
}

/**
 * Where a signed-in user must go next: `/verify-email` until verified, `/enrollment` until
 * linked to a health facility, otherwise the dashboard. (login action + login page load)
 */
export function postLoginPath(user: Pick<HfSessionUser, "emailVerified" | "email" | "healthFacility">): string {
  if (!user.emailVerified) return verifyEmailPath(user.email);
  if (!user.healthFacility) return "/enrollment";
  return "/";
}

/** `/verify-email` page load: verified users are sent on, others see the form. */
export function verifiedUserRedirect(
  user: Pick<HfSessionUser, "emailVerified" | "healthFacility"> | null | undefined
): string | null {
  if (!user?.emailVerified) return null;
  return user.healthFacility ? "/" : "/enrollment";
}

export type AccessDecision =
  | { type: "ok" }
  | { type: "redirect"; status: 303; to: string }
  | { type: "forbidden"; status: 403; message: string };

/** Guard of the signed-in app shell (`(app)` layout): verified email, facility, route permission. */
export function resolveAppAccess(user: HfSessionUser, pathname: string): AccessDecision {
  if (!user.emailVerified) return { type: "redirect", status: 303, to: verifyEmailPath(user.email) };
  if (!user.healthFacility) return { type: "redirect", status: 303, to: "/enrollment" };
  if (!canAccessPath(user, pathname)) {
    return { type: "forbidden", status: 403, message: "You do not have permission to access this page." };
  }
  return { type: "ok" };
}

/** Guard of the enrollment area: signed in, verified, and not yet linked to a facility. */
export function resolveEnrollmentAccess(user: HfSessionUser | null | undefined): AccessDecision {
  if (!user) return { type: "redirect", status: 303, to: "/login" };
  if (!user.emailVerified) return { type: "redirect", status: 303, to: verifyEmailPath(user.email) };
  if (user.healthFacility) return { type: "redirect", status: 303, to: "/" };
  return { type: "ok" };
}

/** Client-visible message for an unexpected server error (SvelteKit `handleError` equivalent). */
export function clientErrorMessage(status: number, message?: string | null): string {
  if (status >= 500) return "An unexpected problem occurred. Please try again shortly.";
  if (status === 400) return message && message !== "Bad Request" ? message : "The request was invalid.";
  return message || "Something went wrong.";
}
