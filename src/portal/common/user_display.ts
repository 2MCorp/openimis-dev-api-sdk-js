/** Shared display helpers for session-user-like objects. */

export type NameFields = {
  username?: string | null;
  otherNames?: string | null;
  lastName?: string | null;
};

/** Up to two leading initials, upper-cased (`"jane doe smith"` -> `"JD"`). */
export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0] ?? "")
    .join("")
    .toUpperCase();
}

export function userDisplayName(user: NameFields | null | undefined): string {
  if (!user) return "";
  const full = [user.otherNames, user.lastName]
    .map((p) => p?.trim())
    .filter(Boolean)
    .join(" ");
  return full || user.username?.trim() || "";
}

export function userInitials(user: NameFields | null | undefined): string {
  const name = userDisplayName(user);
  return name ? initials(name) : "?";
}

/** Backend permission codename -> readable text (`api_auth.view_x_y` -> `view x y`). */
export function formatPermission(permission: string): string {
  return permission.replace(/^api_auth\./, "").replace(/_/g, " ");
}
