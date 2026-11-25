import { describe, expect, it } from "vitest";
import {
  localeCookieString,
  localeFromAcceptLanguage,
  negotiateLocale,
  textDirection,
} from "../../src/portal/common/locale";

describe("portal locale", () => {
  it("prefers a valid cookie", () => {
    expect(negotiateLocale({ cookie: "fr", acceptLanguage: "pt" })).toBe("fr");
  });
  it("ignores an unknown cookie and uses Accept-Language by weight", () => {
    expect(negotiateLocale({ cookie: "de", acceptLanguage: "de,pt-BR;q=0.8,en;q=0.5" })).toBe("pt");
  });
  it("falls back to en", () => {
    expect(negotiateLocale({})).toBe("en");
    expect(localeFromAcceptLanguage("*;q=0.1")).toBeNull();
  });
  it("detects rtl", () => {
    expect(textDirection("ar")).toBe("rtl");
    expect(textDirection("sw")).toBe("ltr");
  });
  it("builds the cookie string", () => {
    expect(localeCookieString("sw")).toContain("PARAGLIDE_LOCALE=sw;");
  });
});
