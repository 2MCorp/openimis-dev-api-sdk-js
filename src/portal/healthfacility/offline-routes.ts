import { stripLocalePrefix } from "./permissions";

/**
 * Which screen the offline shell should show for a pathname. Lists and detail pages read from
 * the on-device cache and work offline; sign-in / staff / enrollment screens need the server.
 */
export type HfOfflineRoute =
  | { kind: "dashboard" }
  | { kind: "patients" }
  | { kind: "patient"; id: string }
  | { kind: "claims" }
  | { kind: "claim"; id: string }
  | { kind: "claim-edit"; id: string }
  | { kind: "encounters" }
  | { kind: "encounter"; id: string }
  | { kind: "encounter-edit"; id: string }
  | { kind: "preauthorizations" }
  | { kind: "preauthorization"; id: string }
  | { kind: "reports" }
  | { kind: "settings" }
  | { kind: "profile" }
  /** `/login`, `/register`, `/verify-email`, `/enrollment/**`: need a connection. */
  | { kind: "needs-connection" }
  /** `/staffs/**` and anything else rendered only by the server. */
  | { kind: "server-only" };

const seg = (s: string) => decodeURIComponent(s);

export function resolveHfOfflineRoute(pathname: string): HfOfflineRoute {
  const path = stripLocalePrefix(pathname).replace(/\/+$/, "") || "/";
  const parts = path.split("/").filter(Boolean);
  const [a, b, c] = parts;

  if (path === "/") return { kind: "dashboard" };
  switch (a) {
    case "patients":
      return b && parts.length === 2 ? { kind: "patient", id: seg(b) } : parts.length === 1 ? { kind: "patients" } : { kind: "server-only" };
    case "claims":
      if (parts.length === 1) return { kind: "claims" };
      if (parts.length === 2) return { kind: "claim", id: seg(b) };
      if (parts.length === 3 && c === "edit") return { kind: "claim-edit", id: seg(b) };
      return { kind: "server-only" };
    case "encounters":
      if (parts.length === 1) return { kind: "encounters" };
      if (parts.length === 2) return { kind: "encounter", id: seg(b) };
      if (parts.length === 3 && b === "edit") return { kind: "encounter-edit", id: seg(c) };
      return { kind: "server-only" };
    case "pre_authorizations":
      if (parts.length === 1) return { kind: "preauthorizations" };
      if (parts.length === 2) return { kind: "preauthorization", id: seg(b) };
      return { kind: "server-only" };
    case "reports":
      return { kind: "reports" };
    case "settings":
      return { kind: "settings" };
    case "my-profile":
      return { kind: "profile" };
    case "login":
    case "register":
    case "verify-email":
    case "enrollment":
      return { kind: "needs-connection" };
    default:
      return { kind: "server-only" };
  }
}

/** `?to=` of the offline shell if it is a safe same-origin path, else null. */
export function offlineShellTarget(to: string | null | undefined): string | null {
  if (!to || !to.startsWith("/") || to.startsWith("//") || to.startsWith("/\\")) return null;
  if (to === "/offline" || to.startsWith("/offline?") || to.startsWith("/offline/")) return null;
  return to;
}
