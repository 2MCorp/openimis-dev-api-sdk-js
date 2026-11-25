/**
 * Locale negotiation shared by the portals: user choice (cookie) -> browser `Accept-Language`
 * -> base locale, mirroring the Paraglide strategy `['cookie', 'preferredLanguage', 'baseLocale']`.
 */
export const PORTAL_LOCALES = ["en", "fr", "pt", "ar", "sw"] as const;
export type PortalLocale = (typeof PORTAL_LOCALES)[number];
export const PORTAL_BASE_LOCALE: PortalLocale = "en";
/** Same cookie name Paraglide used, so existing user choices survive the port. */
export const PORTAL_LOCALE_COOKIE = "PARAGLIDE_LOCALE";
/** ~400 days, the maximum browsers allow. */
export const PORTAL_LOCALE_COOKIE_MAX_AGE = 34_560_000;

const RTL_LOCALES: ReadonlySet<string> = new Set(["ar", "he", "fa", "ur"]);

export function isPortalLocale(value: unknown): value is PortalLocale {
  return typeof value === "string" && (PORTAL_LOCALES as readonly string[]).includes(value);
}

/** `"rtl"` for Arabic (and other RTL scripts), else `"ltr"`. */
export function textDirection(locale: string): "ltr" | "rtl" {
  return RTL_LOCALES.has(locale.split("-")[0].toLowerCase()) ? "rtl" : "ltr";
}

/** Best supported locale for an `Accept-Language` header (q-weighted, region stripped). */
export function localeFromAcceptLanguage(header: string | null | undefined): PortalLocale | null {
  if (!header) return null;
  const ranked = header
    .split(",")
    .map((part, index) => {
      const [tag, ...params] = part.trim().split(";");
      const q = params.map((p) => p.trim()).find((p) => p.startsWith("q="));
      const weight = q ? Number(q.slice(2)) : 1;
      return { tag: tag.trim().toLowerCase(), weight: Number.isFinite(weight) ? weight : 0, index };
    })
    .filter((entry) => entry.tag && entry.tag !== "*" && entry.weight > 0)
    .sort((a, b) => b.weight - a.weight || a.index - b.index);
  for (const { tag } of ranked) {
    const base = tag.split("-")[0];
    if (isPortalLocale(base)) return base;
  }
  return null;
}

/** Cookie value -> accept-language -> base locale. */
export function negotiateLocale(input: {
  cookie?: string | null;
  acceptLanguage?: string | null;
}): PortalLocale {
  if (isPortalLocale(input.cookie)) return input.cookie;
  return localeFromAcceptLanguage(input.acceptLanguage) ?? PORTAL_BASE_LOCALE;
}

/** `document.cookie` assignment string persisting the user's locale choice. */
export function localeCookieString(locale: PortalLocale): string {
  return `${PORTAL_LOCALE_COOKIE}=${locale}; path=/; max-age=${PORTAL_LOCALE_COOKIE_MAX_AGE}; samesite=lax`;
}
