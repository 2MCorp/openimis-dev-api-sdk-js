import { HF_PORTAL_PERMISSIONS, hasPermission } from "../../auth/permissions";
import { stripLocalePrefix } from "./permissions";

export type HfNavHref =
  | "/"
  | "/patients"
  | "/pre_authorizations"
  | "/encounters"
  | "/claims"
  | "/staffs"
  | "/reports"
  | "/settings"
  | "/my-profile";

/** i18n message keys; the UI resolves them with its own message catalogue. */
export type HfNavTitleKey =
  | "nav_dashboard"
  | "nav_patients"
  | "nav_preauthorizations"
  | "nav_encounters"
  | "nav_claims"
  | "nav_staffs"
  | "nav_reports"
  | "nav_settings";

/** Icon names are plain strings (Lucide icon ids); the UI maps them to components. */
export type HfNavIcon =
  | "layout-dashboard"
  | "users"
  | "file-text"
  | "list"
  | "clipboard-list"
  | "user-cog"
  | "chart-bar"
  | "settings";

export type HfNavItem = {
  href: HfNavHref;
  titleKey: HfNavTitleKey;
  icon: HfNavIcon;
  /** When set, the item is shown only if the user has this permission. */
  permission?: string;
};

const P = HF_PORTAL_PERMISSIONS;

export const HF_MAIN_NAV_ITEMS: readonly HfNavItem[] = [
  { href: "/", titleKey: "nav_dashboard", icon: "layout-dashboard", permission: P.viewDashboard },
  { href: "/patients", titleKey: "nav_patients", icon: "users", permission: P.viewPatients },
  {
    href: "/pre_authorizations",
    titleKey: "nav_preauthorizations",
    icon: "file-text",
    permission: P.viewPreauthorizations,
  },
  { href: "/encounters", titleKey: "nav_encounters", icon: "list", permission: P.viewEncounters },
  { href: "/claims", titleKey: "nav_claims", icon: "clipboard-list", permission: P.viewClaims },
  { href: "/staffs", titleKey: "nav_staffs", icon: "user-cog", permission: P.manageStaff },
  { href: "/reports", titleKey: "nav_reports", icon: "chart-bar" },
];

export const HF_SECONDARY_NAV_ITEMS: readonly HfNavItem[] = [
  { href: "/settings", titleKey: "nav_settings", icon: "settings" },
];

export function filterNavItems(
  items: readonly HfNavItem[],
  user: { permissions?: readonly string[] | null } | null | undefined
): HfNavItem[] {
  return items.filter((item) => !item.permission || hasPermission(user, item.permission));
}

export function isNavActive(pathname: string, href: string): boolean {
  const path = stripLocalePrefix(pathname);
  if (href === "/") return path === "/";
  return path === href || path.startsWith(`${href}/`);
}
