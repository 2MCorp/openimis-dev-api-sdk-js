import type { Access, AccessKey } from "./access";
import { ACCESS_PERMISSIONS, stripLocalePrefix } from "./access";

export type AppNavHref =
  | "/"
  | "/members"
  | "/health-packages"
  | "/payments"
  | "/contracts"
  | "/staffs"
  | "/reports"
  | "/settings"
  | "/profile";

/** Message keys (i18n) of the nav titles. */
export type NavTitleKey =
  | "nav_dashboard"
  | "nav_members"
  | "nav_health_packages"
  | "nav_payments"
  | "nav_contracts"
  | "nav_staffs"
  | "nav_reports"
  | "nav_settings";

export type NavItem = {
  href: AppNavHref;
  titleKey: NavTitleKey;
  /** Lucide icon name (kebab-case) — the UI maps it to a component. */
  icon: string;
  /** Shown only if the user has access to this feature. */
  access?: AccessKey;
  /** Backend permission behind `access` (plain string), for server-side checks. */
  permission?: string;
};

function item(href: AppNavHref, titleKey: NavTitleKey, icon: string, access?: AccessKey): NavItem {
  return { href, titleKey, icon, access, permission: access ? ACCESS_PERMISSIONS[access] : undefined };
}

export const mainNavItems: NavItem[] = [
  item("/", "nav_dashboard", "layout-dashboard", "dashboard"),
  item("/members", "nav_members", "users", "members"),
  item("/health-packages", "nav_health_packages", "package", "packages"),
  item("/payments", "nav_payments", "receipt", "payments"),
  item("/contracts", "nav_contracts", "file-stack", "contracts"),
  item("/staffs", "nav_staffs", "user-cog", "staff"),
  item("/reports", "nav_reports", "chart-bar"),
];

export const secondaryNavItems: NavItem[] = [item("/settings", "nav_settings", "settings")];

export function filterNavItems(items: readonly NavItem[], access: Access | null | undefined): NavItem[] {
  return items.filter((entry) => !entry.access || !!access?.[entry.access]);
}

export function isNavActive(pathname: string, href: string): boolean {
  const path = stripLocalePrefix(pathname);
  if (href === "/") return path === "/";
  return path === href || path.startsWith(`${href}/`);
}
