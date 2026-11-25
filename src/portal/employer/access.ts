import { PH_PORTAL_PERMISSIONS, hasPermission } from "../../auth/permissions";

/**
 * Feature access flags computed from SDK permission rules. Browser code only reads the
 * booleans; the server computes them with `accessFor(user)`.
 */
export type AccessKey =
  | "dashboard"
  | "members"
  | "manageMembers"
  | "memberClaims"
  | "packages"
  | "payments"
  | "managePayments"
  | "contracts"
  | "manageContracts"
  | "staff";

export type Access = Record<AccessKey, boolean>;

/** Feature → backend permission (`PH_PORTAL_PERMISSIONS`). */
export const ACCESS_PERMISSIONS: Record<AccessKey, string> = {
  dashboard: PH_PORTAL_PERMISSIONS.viewDashboard,
  members: PH_PORTAL_PERMISSIONS.viewEmployees,
  manageMembers: PH_PORTAL_PERMISSIONS.manageEmployees,
  memberClaims: PH_PORTAL_PERMISSIONS.viewEmployeeClaims,
  packages: PH_PORTAL_PERMISSIONS.viewPlans,
  payments: PH_PORTAL_PERMISSIONS.viewPayments,
  managePayments: PH_PORTAL_PERMISSIONS.managePayments,
  contracts: PH_PORTAL_PERMISSIONS.viewContracts,
  manageContracts: PH_PORTAL_PERMISSIONS.manageContracts,
  staff: PH_PORTAL_PERMISSIONS.manageStaff,
};

export const NO_ACCESS: Access = {
  dashboard: false,
  members: false,
  manageMembers: false,
  memberClaims: false,
  packages: false,
  payments: false,
  managePayments: false,
  contracts: false,
  manageContracts: false,
  staff: false,
};

export function accessFor(user: { permissions?: readonly string[] | null } | null | undefined): Access {
  return Object.fromEntries(
    Object.entries(ACCESS_PERMISSIONS).map(([key, permission]) => [key, hasPermission(user, permission)])
  ) as Access;
}

const LOCALE_PREFIX = /^\/(en|fr|pt|ar|sw)(?=\/|$)/;

/** `/fr/members` → `/members`. */
export function stripLocalePrefix(pathname: string): string {
  return pathname.replace(LOCALE_PREFIX, "") || "/";
}

/** Portal route → feature it belongs to (null = open to every signed-in employer user). */
export function routeAccessKey(pathname: string): AccessKey | null {
  const path = stripLocalePrefix(pathname);
  if (path === "/") return "dashboard";
  if (path.startsWith("/members")) return "members";
  if (path.startsWith("/health-packages")) return "packages";
  if (path.startsWith("/payments")) return "payments";
  if (path.startsWith("/contracts")) return "contracts";
  if (path.startsWith("/staffs")) return "staff";
  return null;
}
