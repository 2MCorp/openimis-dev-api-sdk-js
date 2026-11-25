/** Paths served without a session: sign-in area, offline shell, PWA assets, auth API. */
const PUBLIC_EXACT = new Set([
  "/login",
  "/register",
  "/verify-email",
  "/offline",
  "/manifest.webmanifest",
  "/sw.js",
  "/robots.txt",
  "/favicon.ico",
  "/kadchma-logo.png",
]);
const PUBLIC_PREFIXES = ["/api/auth/", "/icons/", "/fonts/", "/_next/"];

export function isHfPublicPath(pathname: string): boolean {
  return PUBLIC_EXACT.has(pathname) || PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));
}

/** Where an unauthenticated request goes: JSON 401 for `/api/*`, else the login page. */
export function unauthenticatedResponseKind(pathname: string): "none" | "api-401" | "login-redirect" {
  if (isHfPublicPath(pathname)) return "none";
  return pathname.startsWith("/api/") ? "api-401" : "login-redirect";
}
