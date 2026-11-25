import { accessFor, routeAccessKey } from "./access";
import type { Access } from "./access";
import { employerPaths } from "./paths";
import type { EmployerSessionUser } from "./session";

export type AppGate =
  | { type: "redirect"; to: string }
  | { type: "forbidden"; status: 403; message: string }
  | { type: "ok"; user: EmployerSessionUser; access: Access; onlinePayments: boolean };

/**
 * Guard for every authenticated app page: login → verify e-mail → enrollment → feature
 * permission for `pathname`. Staff without dashboard access land on the members list.
 * The caller should also probe backend reachability (`createBackendProbe` in common).
 */
export function appGate(
  user: EmployerSessionUser | null | undefined,
  pathname: string,
  options: { onlinePayments?: boolean } = {}
): AppGate {
  if (!user) return { type: "redirect", to: employerPaths.login };
  if (!user.emailVerified) {
    return { type: "redirect", to: employerPaths.verifyEmail(user.email || undefined) };
  }
  if (!user.policyHolder) return { type: "redirect", to: employerPaths.enrollment };

  const access = accessFor(user);
  const required = routeAccessKey(pathname);
  if (required && !access[required]) {
    if (required === "dashboard" && access.members) {
      return { type: "redirect", to: employerPaths.members };
    }
    return { type: "forbidden", status: 403, message: "You do not have permission to access this page." };
  }
  // The Knox token never reaches the client — only safe user fields and the flags.
  return { type: "ok", user, access, onlinePayments: options.onlinePayments === true };
}

/** `/login` and `/register` when already signed in. */
export function guestRedirect(user: EmployerSessionUser | null | undefined, to: "login" | "register"): string | null {
  if (!user) return null;
  if (to === "register") return employerPaths.dashboard;
  if (!user.emailVerified) return employerPaths.verifyEmail(user.email || undefined);
  if (!user.policyHolder) return employerPaths.enrollment;
  return employerPaths.dashboard;
}
