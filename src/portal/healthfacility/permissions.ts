import { HF_PORTAL_PERMISSIONS, hasPermission, slimPermissions } from "../../auth/permissions";

export { hasPermission, hasAnyPermission, normalizePermission } from "../../auth/permissions";

const P = HF_PORTAL_PERMISSIONS;

/**
 * Feature permissions that drive nav / route guards. The `/user/` API may return the whole
 * Django permission catalog; sealing that into the session cookie would exceed the browser
 * cookie limit (~4KB), so only these survive in the session.
 */
export const HF_SESSION_PERMISSIONS = [
  P.viewDashboard,
  P.viewPatients,
  P.viewClaims,
  P.viewEncounters,
  P.viewPreauthorizations,
  P.manageStaff,
] as const;

const SESSION_CATALOG: Record<string, string> = Object.fromEntries(
  HF_SESSION_PERMISSIONS.map((p) => [p, p])
);

/** Keep only the HF-portal session permissions (normalised to `api_auth.*`). */
export function slimHfPermissions(permissions: readonly string[]): string[] {
  return slimPermissions(permissions, SESSION_CATALOG);
}

/** Route → required permission. `exact` routes match the path itself, others the prefix. */
export const HF_ROUTE_PERMISSIONS: ReadonlyArray<{
  path: string;
  exact?: boolean;
  permission: string;
}> = [
  { path: "/", exact: true, permission: P.viewDashboard },
  { path: "/patients", permission: P.viewPatients },
  { path: "/claims", permission: P.viewClaims },
  { path: "/encounters", permission: P.viewEncounters },
  { path: "/pre_authorizations", permission: P.viewPreauthorizations },
  { path: "/staffs", permission: P.manageStaff },
];

const LOCALE_PREFIX = /^\/(en|fr|pt|ar)(?=\/|$)/;

/** Strip a leading `/en|fr|pt|ar` locale segment. */
export function stripLocalePrefix(pathname: string): string {
  return pathname.replace(LOCALE_PREFIX, "") || "/";
}

export function requiredPermissionForPath(pathname: string): string | null {
  const path = stripLocalePrefix(pathname);
  for (const route of HF_ROUTE_PERMISSIONS) {
    const matches = route.exact ? path === route.path || path === "" : path.startsWith(route.path);
    if (matches) return route.permission;
  }
  return null;
}

export function canAccessPath(
  user: { permissions?: readonly string[] | null } | null | undefined,
  pathname: string
): boolean {
  const required = requiredPermissionForPath(pathname);
  return !required || hasPermission(user, required);
}
